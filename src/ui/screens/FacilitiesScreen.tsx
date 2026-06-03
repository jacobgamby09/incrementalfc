import { Building2, Cross, GraduationCap, Search, ShieldCheck, Users, WalletCards } from "lucide-react";
import { developmentProfile } from "../../data/constants/developmentProfiles";
import { activeFacilityTypes, getFacilityLevelConfig, getFacilityProfile, getNextFacilityLevelConfig, getTotalFacilityUpkeep } from "../../data/constants/facilityProfiles";
import { estimateProjectedSeasonBalance } from "../../domain/economy/clubFinance";
import { calculateStadiumAttendance } from "../../domain/economy/stadiumAttendance";
import { canStartFacilityUpgrade, getOperatingReserveWarning } from "../../domain/facilities/facilityUpgrades";
import { calculatePlayerOvr } from "../../domain/player/playerSummaries";
import { formatScoutedPotential, getScoutedPotentialReport } from "../../domain/scouting/scoutedPotential";
import type { ActiveFacilityType } from "../../domain/types/economy";
import type { GameState } from "../../domain/types/game";
import { formatCurrency, formatNumber } from "../../utils/format";

type FacilitiesScreenProps = {
  gameState: GameState;
  onUpgrade: (type: ActiveFacilityType) => void;
  onResolveProspect: (sign: boolean) => void;
};

const icons = {
  trainingGround: ShieldCheck,
  stadium: Building2,
  medicalCenter: Cross,
  scoutingNetwork: Search,
  youthAcademy: GraduationCap
};

function effectText(type: ActiveFacilityType, level: number): string {
  const effects = getFacilityLevelConfig(type, level).effects;
  if (type === "trainingGround") return `Development cap ${effects.developmentCapBonus}; ${effects.focusedTrainingSlots} focused slot${effects.focusedTrainingSlots === 1 ? "" : "s"}; ${Math.round(developmentProfile.baselineTrainingXpPerWeek * (1 + (effects.trainingXpBonus ?? 0)))} squad training XP/player/week`;
  if (type === "stadium") return `${formatNumber(effects.stadiumCapacity ?? 0)} capacity; x${effects.matchdayIncomeMultiplier?.toFixed(2)} home income`;
  if (type === "medicalCenter") return `+${effects.readinessRecoveryBonus ?? 0} readiness recovery`;
  if (type === "scoutingNetwork") return `${effects.marketPoolSize ?? 0} market candidates; improved recruitment reports`;
  return `+${effects.intakeProgressPerWeek ?? 0}% academy progress per week`;
}

export function FacilitiesScreen({ gameState, onUpgrade, onResolveProspect }: FacilitiesScreenProps): JSX.Element {
  const club = gameState.clubs[gameState.playerClubId];
  const season = gameState.seasons[gameState.currentSeasonId];
  const nextHomeFixture = season.fixtures.find((fixture) => fixture.status === "scheduled" && fixture.homeClubId === club.id);
  const attendance = calculateStadiumAttendance(club, nextHomeFixture ? gameState.clubs[nextHomeFixture.awayClubId] : undefined);
  const activeConstruction = activeFacilityTypes.filter((type) => club.facilities[type].construction).length;
  const projectedBalance = estimateProjectedSeasonBalance(gameState);
  const prospect = club.academy.pendingProspect;
  const weeklyCommitments = club.economy.playerWageTotal + club.economy.staffWageTotal + getTotalFacilityUpkeep(club.facilities);
  const academyRate = getFacilityLevelConfig("youthAcademy", club.facilities.youthAcademy.level).effects.intakeProgressPerWeek ?? 0;
  const academyWeeksRemaining = academyRate > 0 ? Math.ceil((100 - club.academy.prospectGenerationProgress) / academyRate) : undefined;
  const prospectPotentialReport = prospect ? getScoutedPotentialReport(prospect, club) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-stone-950">Club Facilities</h2>
        <p className="mt-1 text-sm text-stone-600">Build the club carefully. Every improvement creates a weekly commitment.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Cash balance" value={formatCurrency(club.economy.cashBalance)} />
        <Summary label="Projected season balance" value={formatCurrency(projectedBalance)} />
        <Summary label="Weekly commitments" value={formatCurrency(weeklyCommitments)} />
        <Summary label="Active construction" value={String(activeConstruction)} />
      </section>

      {prospect && (
        <section className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Youth Prospect Ready</p>
              <h3 className="mt-1 text-lg font-bold">{prospect.firstName} {prospect.lastName}</h3>
              <p className="text-sm text-emerald-900">
                Age {prospect.age} / {prospect.primaryPosition} / OVR {Math.round(calculatePlayerOvr(prospect))} / Est. POT {prospectPotentialReport ? formatScoutedPotential(prospectPotentialReport) : "-"} ({prospectPotentialReport?.confidence ?? "Low"} confidence) / Expected wage {formatCurrency(prospect.contract.wagePerWeek)}/wk
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onResolveProspect(false)} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold">Release</button>
              <button type="button" onClick={() => onResolveProspect(true)} className="rounded-md bg-pitch-700 px-3 py-2 text-sm font-semibold text-white">Sign Prospect</button>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-md border border-stone-300 bg-white">
        {activeFacilityTypes.map((type) => {
          const profile = getFacilityProfile(type);
          const facility = club.facilities[type];
          const next = getNextFacilityLevelConfig(type, facility.level);
          const eligibility = canStartFacilityUpgrade(gameState, club.id, type);
          const warning = getOperatingReserveWarning(gameState, club.id, type);
          const Icon = icons[type];
          const construction = facility.construction;
          const progress = construction ? Math.round(((construction.totalWeeks - construction.remainingWeeks) / construction.totalWeeks) * 100) : 0;

          return (
            <div key={type} className="grid gap-4 border-b border-stone-200 p-4 last:border-b-0 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
              <div className="flex gap-3">
                <div className="mt-0.5 rounded-md bg-stone-100 p-2 text-pitch-700"><Icon className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-bold">{profile.name} <span className="text-stone-500">Lv. {facility.level}/{profile.levels.length}</span></h3>
                  <p className="mt-1 text-sm text-stone-600">{profile.description}</p>
                  {type === "trainingGround" && (
                    <p className="mt-2 text-xs text-stone-500">Every player receives baseline squad training XP. Assign focused XP multiplier slots from the Training screen.</p>
                  )}
                  <p className="mt-1 text-xs font-medium text-stone-700">{effectText(type, facility.level)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-stone-500">{next ? "Next level" : "Completed"}</p>
                <p className="mt-1 text-sm text-stone-800">{next ? effectText(type, next.level) : "Maximum level reached"}</p>
              </div>
              <div>
                {construction ? (
                  <>
                    <div className="flex justify-between text-xs font-semibold text-stone-600"><span>Building Lv. {construction.targetLevel}</span><span>{construction.remainingWeeks} week{construction.remainingWeeks === 1 ? "" : "s"}</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full bg-pitch-700" style={{ width: `${progress}%` }} /></div>
                  </>
                ) : next ? (
                  <div className="text-sm">
                    <p><strong>{formatCurrency(next.upgradeCost)}</strong> upfront</p>
                    <p className="text-stone-600">{formatCurrency(next.upkeepPerWeek)}/wk / {next.constructionWeeks} week{next.constructionWeeks === 1 ? "" : "s"}</p>
                  </div>
                ) : null}
                {warning && !construction && <p className="mt-1 text-xs font-semibold text-amber-700">{warning}</p>}
              </div>
              <button
                type="button"
                disabled={!eligibility.allowed}
                title={eligibility.reason}
                onClick={() => {
                  if (!warning || window.confirm(`${warning}\n\nStart construction anyway?`)) onUpgrade(type);
                }}
                className="h-9 rounded-md bg-pitch-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              >
                {construction ? "Building" : next ? "Upgrade" : "Max Level"}
              </button>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-pitch-700" /> Stadium Demand</h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Capacity" value={formatNumber(club.facilities.stadium.effects.stadiumCapacity ?? 0)} />
            <Stat label="Supporter base" value={formatNumber(club.fans)} />
            <Stat label="Hype" value={`${attendance.hype}/100`} />
            <Stat label="Attendance rate" value={`${Math.round(attendance.attendanceRate * 100)}%`} />
            <Stat label="Estimated demand" value={formatNumber(attendance.estimatedDemand)} />
            <Stat label="Expected attendance" value={formatNumber(attendance.attendance)} />
            <Stat label="Expected occupancy" value={`${Math.round(attendance.occupancyRate * 100)}%`} />
            <Stat label="Lost ticket sales" value={formatCurrency(attendance.lostPotentialRevenue)} />
          </dl>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-4">
          <h3 className="flex items-center gap-2 font-bold"><WalletCards className="h-4 w-4 text-pitch-700" /> Youth Intake</h3>
          <div className="mt-3 flex justify-between text-sm"><span>Next prospect</span><strong>{Math.round(club.academy.prospectGenerationProgress)}%</strong></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full bg-pitch-700" style={{ width: `${Math.min(100, club.academy.prospectGenerationProgress)}%` }} /></div>
          <p className="mt-2 text-sm font-semibold text-stone-700">{prospect ? "Prospect decision pending" : `${academyWeeksRemaining ?? "-"} weeks until next prospect`}</p>
          <p className="mt-2 text-xs text-stone-500">Progress pauses while a prospect is waiting for your decision.</p>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }): JSX.Element {
  return <div className="rounded-md border border-stone-300 bg-white p-4"><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>;
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return <div><dt className="text-stone-500">{label}</dt><dd className="font-bold">{value}</dd></div>;
}
