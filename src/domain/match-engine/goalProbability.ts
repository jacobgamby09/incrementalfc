import { clamp } from "../../utils/math";

export function goalProbability(baseXg: number, attackerSkill: number, goalkeeperSkill: number): number {
  const skillRatio = attackerSkill / Math.max(attackerSkill + goalkeeperSkill, 1);
  const skillModifier = 0.75 + skillRatio * 0.5;
  return clamp(baseXg * skillModifier, 0.02, 0.75);
}
