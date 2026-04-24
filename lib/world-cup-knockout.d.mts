export const WORLD_CUP_KNOCKOUT_PREFIX: string;

export type KnockoutMatchDefinition = {
  externalId: string;
  matchNumber: number;
  stage:
    | "ROUND_OF_32"
    | "ROUND_OF_16"
    | "QUARTER_FINAL"
    | "SEMI_FINAL"
    | "THIRD_PLACE"
    | "FINAL";
  kickoffDate: string;
  kickoffTimeEt: string;
  homeLabelHu: string;
  awayLabelHu: string;
};

export const knockoutMatches: KnockoutMatchDefinition[];

export function getKnockoutPlaceholderLabels(
  externalId: string | null | undefined,
):
  | {
      home: string;
      away: string;
    }
  | null;
