import { useState } from "react";
import { FileSignature, Handshake, Inbox, Search, UserMinus, UserPlus } from "lucide-react";
import type { GameState } from "../../domain/types/game";
import { calculatePlayerOvr } from "../../domain/player/playerSummaries";
import { formatScoutedPotential, getScoutedPotentialReport } from "../../domain/scouting/scoutedPotential";
import { formatCurrency } from "../../utils/format";
import { PlayerDetailSheet } from "../components/player/PlayerDetailSheet";
import { useGameStore } from "../../store/gameStore";
import type { NegotiationPackage, SaleStrategy } from "../../domain/types/transfer";
import type { SquadRole } from "../../domain/types/player";
import { negotiationPackageProfiles, saleStrategyProfiles } from "../../data/constants/transferProfiles";
import { squadRoleLabels } from "../../domain/player/playerContext";

type MarketScreenProps = {
  gameState: GameState;
};

type TabId = "listed" | "free_agents" | "scouted" | "my_listings" | "incoming_offers" | "renewals" | "negotiations";

const tabs: Array<{ id: TabId; label: string; icon: typeof UserMinus }> = [
  { id: "listed", label: "Transfer Listed", icon: UserMinus },
  { id: "free_agents", label: "Free Agents", icon: UserPlus },
  { id: "scouted", label: "Scouted Opportunities", icon: Search },
  { id: "my_listings", label: "My Listings", icon: UserMinus },
  { id: "incoming_offers", label: "Incoming Offers", icon: Inbox },
  { id: "renewals", label: "Renew Contracts", icon: FileSignature },
  { id: "negotiations", label: "Negotiations", icon: Handshake }
];

const squadRoles = Object.keys(squadRoleLabels) as SquadRole[];
const packageIds = Object.keys(negotiationPackageProfiles) as NegotiationPackage[];
const saleStrategyIds = Object.keys(saleStrategyProfiles) as SaleStrategy[];

export function MarketScreen({ gameState }: MarketScreenProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("listed");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [offerPlayerId, setOfferPlayerId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<NegotiationPackage>("fair");
  const [offeredSquadRole, setOfferedSquadRole] = useState<SquadRole>("regular_starter");
  const [contractSeasons, setContractSeasons] = useState(2);
  const [salePlayerId, setSalePlayerId] = useState<string | null>(null);
  const [saleStrategy, setSaleStrategy] = useState<SaleStrategy>("market_price");
  const submitNegotiationOffer = useGameStore((state) => state.submitNegotiationOffer);
  const listPlayerForSale = useGameStore((state) => state.listPlayerForSale);
  const removePlayerListing = useGameStore((state) => state.removePlayerListing);
  const respondToIncomingTransferOffer = useGameStore((state) => state.respondToIncomingTransferOffer);
  const playerClub = gameState.clubs[gameState.playerClubId];

  const listedPlayers = (gameState.transferMarket?.listedPlayerIds ?? [])
    .map((id) => gameState.players[id])
    .filter(Boolean);

  const freeAgents = (gameState.transferMarket?.freeAgentPlayerIds ?? [])
    .map((id) => gameState.players[id])
    .filter(Boolean);
  const scoutedPlayers = (gameState.transferMarket?.scoutedOpportunityPlayerIds ?? [])
    .map((id) => gameState.players[id])
    .filter(Boolean);
  const mySquadPlayers = playerClub.squadPlayerIds
    .map((id) => gameState.players[id])
    .filter(Boolean);
  const myListedPlayers = mySquadPlayers.filter((player) => player.transferIntent.isListed);
  const renewalPlayers = playerClub.squadPlayerIds
    .map((id) => gameState.players[id])
    .filter(Boolean)
    .sort((left, right) => left.contract.seasonsRemaining - right.contract.seasonsRemaining);

  const playersToDisplay = activeTab === "listed"
    ? listedPlayers
    : activeTab === "free_agents"
      ? freeAgents
      : activeTab === "scouted"
          ? scoutedPlayers
        : activeTab === "my_listings"
          ? mySquadPlayers
        : renewalPlayers;
  const selectedPlayer = selectedPlayerId ? gameState.players[selectedPlayerId] : undefined;
  const offerPlayer = offerPlayerId ? gameState.players[offerPlayerId] : undefined;
  const salePlayer = salePlayerId ? gameState.players[salePlayerId] : undefined;
  const offerKind = offerPlayer?.clubId === playerClub.id ? "renewal" : "signing";

  const reasonLabels: Record<string, string> = {
    financial_pressure: "Financial Pressure",
    player_unhappy: "Unhappy",
    contract_declining: "Declining Contract",
    too_good_for_division: "Outgrown League",
    excess_squad: "Squad Surplus",
    player_listed: "Listed by Club",
    none: "None"
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">Transfer Market</h2>
          <p className="text-sm text-stone-600">
            Use your limited offseason actions to strengthen the squad. Contract renewals do not consume transfer actions.
          </p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm">
          {gameState.transferMarket.status === "open" ? (
            <>
              <p className="font-semibold text-pitch-800">Offseason window open</p>
              <p className="mt-1 text-stone-600">
                Week {gameState.transferMarket.currentWeek} / {gameState.transferMarket.totalWeeks}
                {" "} - {gameState.transferMarket.actionsRemaining} actions remaining
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-stone-800">Transfer window closed</p>
              <p className="mt-1 text-stone-600">Player approaches are only available during the offseason.</p>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-wrap border-b border-stone-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id === "listed"
            ? listedPlayers.length
            : tab.id === "free_agents"
              ? freeAgents.length
              : tab.id === "scouted"
                ? scoutedPlayers.length
                : tab.id === "my_listings"
                  ? myListedPlayers.length
                : tab.id === "incoming_offers"
                  ? gameState.transferMarket.incomingOffers.filter((offer) => offer.status === "pending").length
                : tab.id === "renewals"
                  ? renewalPlayers.length
                  : Object.keys(gameState.transferMarket.negotiations).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-pitch-700 text-pitch-700"
                  : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {activeTab === "incoming_offers" ? (
        <div className="rounded-md border border-stone-300 bg-white p-4">
          {gameState.transferMarket.incomingOffers.filter((offer) => offer.status === "pending").length === 0 ? (
            <p className="text-sm text-stone-600">No active incoming offers. Listing players and advancing the window can attract new bids.</p>
          ) : (
            <div className="space-y-2">
              {gameState.transferMarket.incomingOffers.filter((offer) => offer.status === "pending").map((offer) => {
                const player = gameState.players[offer.playerId];
                const buyer = gameState.clubs[offer.buyingClubId];
                return (
                  <div key={offer.id} className="flex flex-col gap-3 rounded-md border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <button type="button" onClick={() => setSelectedPlayerId(player.id)} className="font-semibold text-pitch-700 hover:underline">
                        {player.firstName} {player.lastName}
                      </button>
                      <p className="mt-1 text-sm text-stone-700">
                        {buyer.name} bid <span className="font-bold">{formatCurrency(offer.amount)}</span>
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {saleStrategyProfiles[offer.strategy].label} listing - respond before advancing beyond week {offer.expiresAfterWeek}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => respondToIncomingTransferOffer(offer.id, "reject")} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                        Reject
                      </button>
                      <button type="button" onClick={() => respondToIncomingTransferOffer(offer.id, "accept")} className="rounded-md bg-pitch-700 px-3 py-2 text-sm font-semibold text-white hover:bg-pitch-900">
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "negotiations" ? (
        <div className="rounded-md border border-stone-300 bg-white p-4">
          {Object.values(gameState.transferMarket.negotiations).length === 0 ? (
            <p className="text-sm text-stone-600">No negotiations started during this window.</p>
          ) : (
            <div className="space-y-2">
              {Object.values(gameState.transferMarket.negotiations).map((negotiation) => {
                const player = gameState.players[negotiation.playerId];
                return (
                  <div key={negotiation.id} className="flex flex-col gap-2 rounded-md border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{player ? `${player.firstName} ${player.lastName}` : "Unknown player"}</p>
                      <p className="text-xs text-stone-500">
                        {negotiation.kind === "renewal" ? "Contract renewal" : "Signing"} - {negotiation.status} - {negotiation.attemptsRemaining} patience remaining
                      </p>
                      <p className="mt-1 text-sm text-stone-700">{negotiation.message}</p>
                    </div>
                    {negotiation.status === "active" && player && (
                      <button
                        type="button"
                        onClick={() => setOfferPlayerId(player.id)}
                        className="rounded-md bg-pitch-700 px-3 py-2 text-sm font-semibold text-white hover:bg-pitch-900"
                      >
                        Improve Offer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      <div className="rounded-md border border-stone-300 bg-white overflow-hidden">
        {playersToDisplay.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-600">
            No players currently in this category. The market will update when the next offseason window opens.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Club</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">OVR</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Est. POT</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Market Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Asking Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Listing Reason</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {playersToDisplay.map((player) => {
                  const ovr = calculatePlayerOvr(player);
                  const potentialReport = getScoutedPotentialReport(player, playerClub);
                  const clubName = player.clubId ? (gameState.clubs[player.clubId]?.name ?? "Other Club") : "Free Agent";
                  
                  return (
                    <tr key={player.id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(player.id)}
                          className="font-semibold text-pitch-700 hover:text-pitch-900 text-left hover:underline"
                        >
                          {player.firstName} {player.lastName}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">{player.primaryPosition}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">{player.age}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">{clubName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold tabular-nums">{Math.round(ovr)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-stone-600 tabular-nums">
                        {formatScoutedPotential(potentialReport)}
                        <span className="ml-2 text-xs font-medium text-stone-400">{potentialReport.confidence}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold tabular-nums">{player.marketReputation}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-stone-900 tabular-nums">
                        {player.clubId ? formatCurrency(player.transferIntent?.askingPrice ?? player.contract.marketValue) : "Free"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-600">
                        {reasonLabels[player.transferIntent?.listingReason ?? "none"] ?? "None"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {activeTab === "my_listings" ? (
                          player.transferIntent.isListed ? (
                            <button type="button" onClick={() => removePlayerListing(player.id)} className="rounded border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                              Remove Listing
                            </button>
                          ) : (
                            <button type="button" onClick={() => setSalePlayerId(player.id)} disabled={gameState.transferMarket.status !== "open" || player.contract.seasonsRemaining <= 0} className="rounded bg-pitch-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-pitch-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400">
                              List for Sale
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOfferPlayerId(player.id)}
                            disabled={
                              gameState.transferMarket.status !== "open" ||
                              (player.clubId !== playerClub.id && gameState.transferMarket.actionsRemaining <= 0)
                            }
                            className="inline-flex items-center gap-1 rounded bg-pitch-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-pitch-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                          >
                            <Handshake className="h-3 w-3" aria-hidden="true" />
                            <span>{player.clubId === playerClub.id ? "Renew" : "Approach"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {salePlayer && (
        <section className="rounded-md border border-pitch-300 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-pitch-700">List Player for Sale</p>
              <h3 className="mt-1 text-lg font-bold">{salePlayer.firstName} {salePlayer.lastName}</h3>
              <p className="text-sm text-stone-600">Choose the tradeoff between a quicker sale and a higher asking price.</p>
            </div>
            <button type="button" onClick={() => setSalePlayerId(null)} className="text-sm font-semibold text-stone-500 hover:text-stone-900">Close</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {saleStrategyIds.map((strategy) => {
              const profile = saleStrategyProfiles[strategy];
              return (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => setSaleStrategy(strategy)}
                  className={`rounded-md border p-3 text-left transition ${saleStrategy === strategy ? "border-pitch-600 bg-pitch-50" : "border-stone-200 hover:border-stone-400"}`}
                >
                  <span className="font-bold text-stone-900">{profile.label}</span>
                  <span className="mt-1 block text-xs text-stone-600">{profile.description}</span>
                  <span className="mt-2 block text-sm font-semibold text-pitch-800">
                    {formatCurrency(Math.round(salePlayer.contract.marketValue * profile.askingPriceMultiplier))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => { listPlayerForSale(salePlayer.id, saleStrategy); setSalePlayerId(null); }} className="rounded-md bg-pitch-700 px-4 py-2 text-sm font-semibold text-white hover:bg-pitch-900">
              Confirm Listing
            </button>
          </div>
        </section>
      )}

      {offerPlayer && (
        <section className="rounded-md border border-pitch-300 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-pitch-700">{offerKind === "renewal" ? "Contract Renewal" : "Player Approach"}</p>
              <h3 className="mt-1 text-lg font-bold">{offerPlayer.firstName} {offerPlayer.lastName}</h3>
              <p className="text-sm text-stone-600">
                {offerKind === "renewal" ? "Contract renewals do not consume transfer actions." : "Every submitted signing offer spends one offseason action."}
              </p>
            </div>
            <button type="button" onClick={() => setOfferPlayerId(null)} className="text-sm font-semibold text-stone-500 hover:text-stone-900">Close</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-stone-700">
              Offer package
              <select value={packageId} onChange={(event) => setPackageId(event.target.value as NegotiationPackage)} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2">
                {packageIds.map((id) => <option key={id} value={id}>{negotiationPackageProfiles[id].label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Promised squad role
              <select value={offeredSquadRole} onChange={(event) => setOfferedSquadRole(event.target.value as SquadRole)} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2">
                {squadRoles.map((role) => <option key={role} value={role}>{squadRoleLabels[role]}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Contract length
              <select value={contractSeasons} onChange={(event) => setContractSeasons(Number(event.target.value))} className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2">
                {[1, 2, 3].map((seasons) => <option key={seasons} value={seasons}>{seasons} season{seasons === 1 ? "" : "s"}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
            <p className="font-semibold">{negotiationPackageProfiles[packageId].description}</p>
            <p className="mt-1">Proposed wage: {formatCurrency(Math.round(offerPlayer.contract.wagePerWeek * negotiationPackageProfiles[packageId].wageMultiplier))}/wk</p>
            {offerKind === "signing" && offerPlayer.clubId && (
              <p>Transfer fee: {formatCurrency(Math.round((offerPlayer.transferIntent.askingPrice || offerPlayer.contract.marketValue) * negotiationPackageProfiles[packageId].transferFeeMultiplier))}</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                submitNegotiationOffer({
                  playerId: offerPlayer.id,
                  kind: offerKind,
                  packageId,
                  offeredSquadRole,
                  contractSeasons
                });
                setOfferPlayerId(null);
                setActiveTab("negotiations");
              }}
              disabled={offerKind === "signing" && gameState.transferMarket.actionsRemaining <= 0}
              className="rounded-md bg-pitch-700 px-4 py-2 text-sm font-semibold text-white hover:bg-pitch-900 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Submit Offer
            </button>
          </div>
        </section>
      )}

      {selectedPlayer && (
        <PlayerDetailSheet
          player={selectedPlayer}
          gameState={gameState}
          scoutedPotential={getScoutedPotentialReport(selectedPlayer, playerClub)}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  );
}
