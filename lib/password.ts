import { z } from "zod";

const passwordLowercase = "abcdefghijkmnopqrstuvwxyz";
const passwordUppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const passwordNumbers = "23456789";
const passwordSymbols = "!@#$%^&*_-+=?";
const passwordCharacters = `${passwordLowercase}${passwordUppercase}${passwordNumbers}${passwordSymbols}`;

export const passwordSchema = z
  .string()
  .min(12, "A jelszó legalább 12 karakter hosszú legyen.")
  .regex(/[a-z]/, "A jelszó tartalmazzon kisbetűt.")
  .regex(/[A-Z]/, "A jelszó tartalmazzon nagybetűt.")
  .regex(/\d/, "A jelszó tartalmazzon számot.")
  .regex(/[^A-Za-z0-9]/, "A jelszó tartalmazzon speciális karaktert.");

export const passwordRequirementDefinitions = [
  {
    label: "Legalább 12 karakter",
    test: (password: string) => password.length >= 12,
  },
  {
    label: "Tartalmaz kisbetűt",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "Tartalmaz nagybetűt",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "Tartalmaz számot",
    test: (password: string) => /\d/.test(password),
  },
  {
    label: "Tartalmaz speciális karaktert",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
] as const;

export function getPasswordChecks(password: string) {
  return passwordRequirementDefinitions.map((requirement) => ({
    label: requirement.label,
    isValid: requirement.test(password),
  }));
}

function getRandomCharacter(characters: string) {
  const randomValues = new Uint32Array(1);

  globalThis.crypto.getRandomValues(randomValues);

  return characters[randomValues[0] % characters.length];
}

function shuffleCharacters(characters: string[]) {
  const shuffledCharacters = [...characters];

  for (let index = shuffledCharacters.length - 1; index > 0; index -= 1) {
    const randomValues = new Uint32Array(1);

    globalThis.crypto.getRandomValues(randomValues);

    const swapIndex = randomValues[0] % (index + 1);
    const currentCharacter = shuffledCharacters[index];

    shuffledCharacters[index] = shuffledCharacters[swapIndex];
    shuffledCharacters[swapIndex] = currentCharacter;
  }

  return shuffledCharacters.join("");
}

export function generateStrongPassword() {
  const requiredCharacters = [
    getRandomCharacter(passwordLowercase),
    getRandomCharacter(passwordUppercase),
    getRandomCharacter(passwordNumbers),
    getRandomCharacter(passwordSymbols),
  ];
  const extraCharacters = Array.from({ length: 12 }, () =>
    getRandomCharacter(passwordCharacters),
  );

  return shuffleCharacters([...requiredCharacters, ...extraCharacters]);
}
