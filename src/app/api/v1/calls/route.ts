import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { createPhoneCall } from "@/lib/retell";

export async function POST(req: NextRequest) {
  // Auth: Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const auth = await validateApiKey(apiKey);
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Parse body
  let body: {
    agent_id: string;
    to_number: string;
    name?: string;
    from_number?: string;
    metadata?: Record<string, unknown>;
    variables?: Record<string, string>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agent_id, to_number, name, from_number, metadata, variables } = body;

  if (!agent_id || !to_number) {
    return NextResponse.json(
      { error: "agent_id and to_number are required" },
      { status: 400 }
    );
  }

  // Validate phone number format
  if (!/^\+\d{8,15}$/.test(to_number)) {
    return NextResponse.json(
      { error: "to_number must be in E.164 format (e.g. +33612345678)" },
      { status: 400 }
    );
  }

  // Find the agent and verify it belongs to the org
  const agent = await prisma.agent.findFirst({
    where: {
      id: agent_id,
      orgId: auth.orgId,
      published: true,
      archived: false,
    },
  });

  if (!agent || !agent.retellAgentId) {
    return NextResponse.json(
      { error: "Agent not found or not published" },
      { status: 404 }
    );
  }

  // Determine from_number
  let callerNumber = from_number;
  if (!callerNumber) {
    // Use first phone number assigned to this org
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { orgId: auth.orgId },
      select: { phoneNumber: true },
    });
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "No from_number provided and no phone number configured" },
        { status: 400 }
      );
    }
    callerNumber = phoneNumber.phoneNumber;
  }

  // Find or create contact
  let contact = await prisma.contact.findFirst({
    where: { phone: to_number, orgId: auth.orgId },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        phone: to_number,
        name: name || to_number,
        orgId: auth.orgId!,
        userId: auth.userId,
      },
    });
  } else if (name && contact.name !== name) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: { name },
    });
  }

  try {
    // Create call via Retell
    const retellCall = await createPhoneCall({
      from_number: callerNumber!,
      to_number,
      override_agent_id: agent.retellAgentId,
      metadata: {
        orgId: auth.orgId,
        contactId: contact.id,
        contactName: name || contact.name,
        source: "api",
        direction: "outbound",
        ...metadata,
      },
      retell_llm_dynamic_variables: {
        ...(name ? { name } : {}),
        ...variables,
      },
    });

    // Create call record in DB
    const call = await prisma.call.create({
      data: {
        retellCallId: retellCall.call_id,
        status: "pending",
        contactId: contact.id,
        orgId: auth.orgId,
        userId: auth.userId,
        metadata: {
          direction: "outbound",
          toNumber: to_number,
          fromNumber: callerNumber,
          contactName: name || contact.name,
          source: "api",
          ...metadata,
        },
      },
    });

    return NextResponse.json({
      success: true,
      call_id: call.id,
      retell_call_id: retellCall.call_id,
      contact_id: contact.id,
      status: "pending",
    });
  } catch (err) {
    console.error("[API v1/calls] Error:", err);
    return NextResponse.json(
      { error: "Failed to create call", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
