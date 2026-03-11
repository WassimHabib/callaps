export interface Voice {
  id: string;
  name: string;
  provider: string;
  gender: "Male" | "Female";
  accent: string;
  age: "Young" | "Middle Aged" | "Old";
  previewUrl?: string;
}

// Voices from Retell AI — curated selection with all French voices
export const voices: Voice[] = [
  // French voices (prioritized)
  { id: "cartesia-Emma", name: "Emma", provider: "cartesia", gender: "Female", accent: "French", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-65b25c5d-ff07-4687-a04c-da2f43ef6fa9.mp3" },
  { id: "cartesia-Pierre", name: "Pierre", provider: "cartesia", gender: "Male", accent: "French", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-0418348a-0ca2-4e90-9986-800fb8b3bbc0.mp3" },
  { id: "minimax-Louis", name: "Louis", provider: "minimax", gender: "Male", accent: "French", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/louis.mp3" },
  { id: "cartesia-Hailey-French", name: "Hailey (FR)", provider: "cartesia", gender: "Female", accent: "French", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-284d1552-ff0c-4068-ad6f-1eab97bee041.mp3" },
  { id: "minimax-Camille", name: "Camille", provider: "minimax", gender: "Female", accent: "French", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/camille.mp3" },

  // Retell Platform
  { id: "retell-Willa", name: "Willa", provider: "platform", gender: "Female", accent: "British", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Willa.mp3" },
  { id: "retell-Alejandro", name: "Alejandro", provider: "platform", gender: "Male", accent: "Mexican", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Alejandro.mp3" },
  { id: "retell-Nico", name: "Nico", provider: "platform", gender: "Male", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax_nico.mp3" },
  { id: "retell-Leland", name: "Leland", provider: "platform", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Leland.mp3" },
  { id: "retell-Della", name: "Della", provider: "platform", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Della.mp3" },
  { id: "retell-Marissa", name: "Marissa", provider: "platform", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/fish_audio-Marissa.mp3" },
  { id: "retell-Andrea", name: "Andrea", provider: "platform", gender: "Female", accent: "Mexican", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Andrea.mp3" },
  { id: "retell-Chloe", name: "Chloe", provider: "platform", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-Chloe.mp3" },

  // ElevenLabs
  { id: "11labs-Willa", name: "Willa", provider: "elevenlabs", gender: "Female", accent: "British", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/11labs-Willa.mp3" },
  { id: "11labs-Dorothy", name: "Dorothy", provider: "elevenlabs", gender: "Female", accent: "British", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/Dorothy.mp3" },
  { id: "11labs-Anthony", name: "Anthony", provider: "elevenlabs", gender: "Male", accent: "British", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/anthony.mp3" },
  { id: "11labs-Billy", name: "Billy", provider: "elevenlabs", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/billy.mp3" },
  { id: "11labs-Lily", name: "Lily", provider: "elevenlabs", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/lily.mp3" },
  { id: "11labs-Marissa", name: "Marissa", provider: "elevenlabs", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/marissa.mp3" },
  { id: "11labs-Merritt", name: "Merritt", provider: "elevenlabs", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/11labs-Merritt.mp3" },
  { id: "11labs-Amy", name: "Amy (UK)", provider: "elevenlabs", gender: "Female", accent: "British", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/Amy.mp3" },
  { id: "11labs-Bing", name: "Bing", provider: "elevenlabs", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/bing.mp3" },

  // OpenAI
  { id: "openai-Nova", name: "Nova", provider: "openai", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/nova_.wav" },
  { id: "openai-Marissa", name: "Marissa", provider: "openai", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/openai-voice_689b96d2cdf881919d198e26029928f4.mp3" },
  { id: "openai-Julia", name: "Julia", provider: "openai", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/openai-voice_689b96bc832481918fff5698b45cc94a.mp3" },
  { id: "openai-Echo", name: "Echo", provider: "openai", gender: "Male", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/echo_.wav" },
  { id: "openai-Adrian", name: "Adrian", provider: "openai", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/openai-voice_689b9635d324819181f8de05446c55d4.mp3" },
  { id: "openai-Fable", name: "Fable", provider: "openai", gender: "Male", accent: "British", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/fable_.wav" },
  { id: "openai-Ash", name: "Ash", provider: "openai", gender: "Male", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/openai-ash.wav" },

  // Cartesia (non-French)
  { id: "cartesia-Cleo", name: "Cleo", provider: "cartesia", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-cc444464-5920-438d-ac33-e6a6dd34a955.mp3" },
  { id: "cartesia-Willa", name: "Willa", provider: "cartesia", gender: "Female", accent: "British", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-Willa.mp3" },
  { id: "cartesia-Adam", name: "Adam", provider: "cartesia", gender: "Male", accent: "British", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-7cf0e2b1-8daf-4fe4-89ad-f6039398f359.mp3" },
  { id: "cartesia-Brian", name: "Brian", provider: "cartesia", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-ccb4cea5-13c8-4559-a9c8-e83bc8171c4d.mp3" },
  { id: "cartesia-Evie", name: "Evie", provider: "cartesia", gender: "Female", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-214c4b7d-9ba4-4114-87fa-be8e4ce9330e.mp3" },

  // Minimax (non-French)
  { id: "minimax-Daniel", name: "Daniel", provider: "minimax", gender: "Male", accent: "American", age: "Young", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/daniel.mp3" },
  { id: "minimax-Ashley", name: "Ashley", provider: "minimax", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/ashley.mp3" },
  { id: "minimax-Brynne", name: "Brynne", provider: "minimax", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Brynne.mp3" },
  { id: "minimax-Sloane", name: "Sloane", provider: "minimax", gender: "Female", accent: "American", age: "Middle Aged", previewUrl: "https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Sloane.mp3" },
];

export const providers = [
  "cartesia",
  "platform",
  "elevenlabs",
  "openai",
  "minimax",
] as const;

export const accents = [...new Set(voices.map((v) => v.accent))].sort();
export const genders = ["Male", "Female"] as const;
