import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "auth_token";
const EXPIRATION = "7d";

export interface JWTPayload {
  userId: string;
  role: string;
  email: string;
}

export async function createSession(user: {
  id: string;
  role: string;
  email: string;
}): Promise<void> {
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    email: user.email,
  } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRATION)
    .setIssuedAt()
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
