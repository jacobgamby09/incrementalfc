import type { RandomSource } from "../../utils/random";

export type ClubIdentity = {
  name: string;
  shortName: string;
};

export type NationalityProfile = {
  nationality: string;
  firstNames: readonly string[];
  lastNames: readonly string[];
};

type WeightedNationality = {
  nationality: string;
  weight: number;
};

export const clubIdentitiesByLeagueLevel: Record<number, readonly ClubIdentity[]> = {
  1: [
    { name: "Incremental FC", shortName: "IFC" },
    { name: "Ashford Borough", shortName: "ASH" },
    { name: "Brindle Town", shortName: "BRI" },
    { name: "Cedar Athletic", shortName: "CED" },
    { name: "Dunmere Rovers", shortName: "DUN" },
    { name: "Eastvale United", shortName: "EAS" },
    { name: "Fellbridge Albion", shortName: "FEL" },
    { name: "Greyford City", shortName: "GRE" },
    { name: "Holloway Rangers", shortName: "HOL" },
    { name: "Kingsport Wanderers", shortName: "KIN" }
  ],
  2: [
    { name: "Alderwick Town", shortName: "ALD" },
    { name: "Bramley County", shortName: "BRA" },
    { name: "Chesterfield Vale", shortName: "CHV" },
    { name: "Denton Athletic", shortName: "DEN" },
    { name: "Elmstead United", shortName: "ELM" },
    { name: "Foxborough City", shortName: "FOX" },
    { name: "Gainsford Rovers", shortName: "GAI" },
    { name: "Hartmere Albion", shortName: "HAR" },
    { name: "Ironbridge Town", shortName: "IRO" },
    { name: "Juniper Wanderers", shortName: "JUN" }
  ],
  3: [
    { name: "Aylesbury City", shortName: "AYL" },
    { name: "Blackwater Rovers", shortName: "BLA" },
    { name: "Colwick United", shortName: "COL" },
    { name: "Derwent Borough", shortName: "DER" },
    { name: "Everton Heath", shortName: "EVH" },
    { name: "Fairhaven Athletic", shortName: "FAI" },
    { name: "Grantham Vale", shortName: "GRA" },
    { name: "Highmoor Town", shortName: "HIG" },
    { name: "Ivybridge City", shortName: "IVY" },
    { name: "Kirkdale Albion", shortName: "KIR" }
  ],
  4: [
    { name: "Arlington County", shortName: "ARL" },
    { name: "Bexley United", shortName: "BEX" },
    { name: "Cromwell City", shortName: "CRO" },
    { name: "Drayton Rovers", shortName: "DRA" },
    { name: "Elmsworth Athletic", shortName: "ELS" },
    { name: "Fenwick Town", shortName: "FEN" },
    { name: "Grafton Albion", shortName: "GRT" },
    { name: "Haversham County", shortName: "HAV" },
    { name: "Inglewood United", shortName: "ING" },
    { name: "Kingsley City", shortName: "KIC" }
  ],
  5: [
    { name: "Abbey Park", shortName: "ABP" },
    { name: "Bromwich City", shortName: "BMC" },
    { name: "Cavendish United", shortName: "CAV" },
    { name: "Docklands FC", shortName: "DOC" },
    { name: "Epping Athletic", shortName: "EPP" },
    { name: "Forge City", shortName: "FOR" },
    { name: "Greenwich Rovers", shortName: "GRW" },
    { name: "Hampton Albion", shortName: "HMP" },
    { name: "Islington Town", shortName: "ISL" },
    { name: "Lancaster County", shortName: "LAN" }
  ]
};

const englishFirstNames = [
  "Aaron", "Adam", "Alfie", "Archie", "Arthur", "Bailey", "Ben", "Billy", "Bradley", "Callum",
  "Cameron", "Charlie", "Connor", "Daniel", "Dylan", "Edward", "Elliot", "Ethan", "Finley", "Finn",
  "Freddie", "George", "Harry", "Harvey", "Isaac", "Jack", "Jacob", "Jake", "James", "Jamie",
  "Jayden", "Joe", "Josh", "Kieran", "Leo", "Lewis", "Liam", "Logan", "Louie", "Luke",
  "Mason", "Max", "Morgan", "Nathan", "Noah", "Oliver", "Oscar", "Owen", "Reece", "Riley",
  "Ryan", "Sam", "Samuel", "Sonny", "Theo", "Thomas", "Toby", "Tom", "Tyler", "William",
  "Zac"
];
const englishLastNames = [
  "Adams", "Allen", "Andrews", "Atkinson", "Bailey", "Baker", "Barker", "Barnes", "Bennett", "Booth",
  "Bradley", "Brooks", "Brown", "Burton", "Butler", "Campbell", "Carter", "Chapman", "Clarke", "Collins",
  "Cook", "Cooper", "Cox", "Davies", "Dawson", "Dixon", "Edwards", "Ellis", "Evans", "Fisher",
  "Foster", "Fox", "Gibson", "Graham", "Grant", "Gray", "Green", "Griffiths", "Hall", "Harrison",
  "Hayes", "Hill", "Holmes", "Howard", "Hughes", "Jackson", "James", "Jenkins", "Johnson", "Jones",
  "Kelly", "Knight", "Lawrence", "Lee", "Lewis", "Lloyd", "Marshall", "Martin", "Miller", "Mitchell",
  "Moore", "Morgan", "Morris", "Murphy", "Palmer", "Parker", "Phillips", "Price", "Reed", "Richards",
  "Richardson", "Roberts", "Robinson", "Rogers", "Russell", "Scott", "Shaw", "Smith", "Spencer", "Stevens",
  "Taylor", "Thompson", "Turner", "Walker", "Walsh", "Ward", "Watson", "Webb", "White", "Williams",
  "Wilson", "Wood", "Wright", "Young"
];

export const nationalityProfiles: Record<string, NationalityProfile> = {
  England: { nationality: "England", firstNames: englishFirstNames, lastNames: englishLastNames },
  France: { nationality: "France", firstNames: ["Adrien", "Alexandre", "Antoine", "Baptiste", "Bastien", "Clement", "Enzo", "Etienne", "Florian", "Hugo", "Ibrahim", "Jules", "Kylian", "Leo", "Lucas", "Mathis", "Maxime", "Nathan", "Theo", "Yanis"], lastNames: ["Bernard", "Blanc", "Bonnet", "Chevalier", "Dubois", "Dupont", "Fontaine", "Garnier", "Girard", "Lacroix", "Lambert", "Laurent", "Lefevre", "Leroy", "Marchand", "Martin", "Mercier", "Moreau", "Petit", "Rousseau"] },
  Brazil: { nationality: "Brazil", firstNames: ["Andre", "Arthur", "Breno", "Bruno", "Caio", "Danilo", "Diego", "Felipe", "Gabriel", "Gustavo", "Henrique", "Joao", "Leonardo", "Lucas", "Marcos", "Matheus", "Murilo", "Paulo", "Rafael", "Thiago"], lastNames: ["Almeida", "Alves", "Barbosa", "Cardoso", "Carvalho", "Costa", "Fernandes", "Ferreira", "Gomes", "Lima", "Martins", "Mendes", "Nascimento", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva", "Souza"] },
  Netherlands: { nationality: "Netherlands", firstNames: ["Bas", "Daan", "Finn", "Jasper", "Jens", "Jesse", "Lars", "Luuk", "Mats", "Mees", "Milan", "Noah", "Pim", "Sem", "Stijn", "Thijs", "Tijn", "Wout"], lastNames: ["Bakker", "Bos", "De Boer", "De Groot", "De Jong", "Dekker", "Dijkstra", "Jansen", "Kuipers", "Meijer", "Mulder", "Smit", "Van Dijk", "Van Leeuwen", "Van Veen", "Visser", "Vos", "Willems"] },
  Spain: { nationality: "Spain", firstNames: ["Adrian", "Alejandro", "Alvaro", "Carlos", "David", "Diego", "Hugo", "Iker", "Javier", "Jesus", "Jorge", "Jose", "Manuel", "Marcos", "Miguel", "Pablo", "Sergio", "Unai"], lastNames: ["Alonso", "Alvarez", "Castillo", "Diaz", "Fernandez", "Garcia", "Gomez", "Hernandez", "Jimenez", "Lopez", "Martinez", "Moreno", "Navarro", "Ramirez", "Rodriguez", "Ruiz", "Sanchez", "Torres"] },
  Germany: { nationality: "Germany", firstNames: ["Anton", "David", "Elias", "Emil", "Fabian", "Felix", "Florian", "Jan", "Jonas", "Julian", "Leon", "Lukas", "Mats", "Max", "Moritz", "Niklas", "Noah", "Tim"], lastNames: ["Becker", "Fischer", "Hartmann", "Hoffmann", "Keller", "Klein", "Koch", "Krause", "Lehmann", "Maier", "Meyer", "Muller", "Neumann", "Schmidt", "Schneider", "Schulz", "Wagner", "Weber"] },
  Portugal: { nationality: "Portugal", firstNames: ["Afonso", "Andre", "Bernardo", "Diogo", "Duarte", "Francisco", "Goncalo", "Joao", "Leonardo", "Luis", "Miguel", "Nuno", "Pedro", "Rafael", "Rodrigo", "Rui", "Tiago", "Tomas"], lastNames: ["Almeida", "Antunes", "Barbosa", "Carvalho", "Costa", "Dias", "Fernandes", "Ferreira", "Gomes", "Lopes", "Marques", "Martins", "Mendes", "Moreira", "Oliveira", "Pereira", "Ribeiro", "Silva"] },
  Argentina: { nationality: "Argentina", firstNames: ["Agustin", "Alejandro", "Benjamin", "Cristian", "Emiliano", "Facundo", "Franco", "Gonzalo", "Ignacio", "Joaquin", "Lautaro", "Leandro", "Mateo", "Nicolas", "Santiago", "Tomas", "Valentin", "Thiago"], lastNames: ["Acosta", "Alvarez", "Benitez", "Castro", "Diaz", "Dominguez", "Fernandez", "Gimenez", "Gomez", "Gonzalez", "Lopez", "Martinez", "Morales", "Perez", "Ramirez", "Rodriguez", "Romero", "Sosa"] },
  Belgium: { nationality: "Belgium", firstNames: ["Arthur", "Charles", "Dries", "Eden", "Elias", "Jasper", "Jules", "Lars", "Louis", "Mathias", "Milan", "Noah", "Robin", "Simon", "Thomas", "Victor"], lastNames: ["Claes", "De Smet", "De Vos", "Dubois", "Janssens", "Jacobs", "Lambert", "Maes", "Mertens", "Peeters", "Renard", "Smets", "Vandenberghe", "Van den Broeck", "Vermeulen", "Willems"] },
  Wales: { nationality: "Wales", firstNames: ["Aled", "Ben", "Callum", "Dafydd", "Dylan", "Ellis", "Gareth", "Gwilym", "Ieuan", "Lloyd", "Morgan", "Osian", "Owain", "Rhys", "Tomos", "Trystan"], lastNames: ["Bowen", "Davies", "Edwards", "Evans", "Griffiths", "Harris", "Hopkins", "Howells", "Hughes", "James", "Jenkins", "Jones", "Morgan", "Owen", "Roberts", "Williams"] },
  Italy: { nationality: "Italy", firstNames: ["Alessandro", "Andrea", "Antonio", "Davide", "Edoardo", "Federico", "Francesco", "Gabriele", "Giacomo", "Giovanni", "Leonardo", "Lorenzo", "Luca", "Marco", "Matteo", "Nicolo", "Riccardo", "Simone"], lastNames: ["Bianchi", "Bruno", "Colombo", "Conti", "Costa", "Esposito", "Ferrari", "Fontana", "Gallo", "Greco", "Lombardi", "Mancini", "Marino", "Moretti", "Ricci", "Romano", "Rossi", "Villa"] },
  Denmark: { nationality: "Denmark", firstNames: ["Anders", "Andreas", "Christian", "Emil", "Frederik", "Jonas", "Kasper", "Lucas", "Magnus", "Mathias", "Mikkel", "Nicolai", "Oliver", "Rasmus", "Simon", "Victor"], lastNames: ["Andersen", "Christensen", "Hansen", "Jensen", "Jorgensen", "Kristensen", "Larsen", "Madsen", "Mortensen", "Nielsen", "Olsen", "Pedersen", "Poulsen", "Rasmussen", "Sorensen", "Thomsen"] },
  Scotland: { nationality: "Scotland", firstNames: ["Aidan", "Angus", "Callum", "Connor", "Craig", "Ewan", "Finlay", "Fraser", "Jack", "Jamie", "Lewis", "Logan", "Rory", "Scott", "Stuart", "Ryan"], lastNames: ["Anderson", "Campbell", "Clark", "Davidson", "Fraser", "Gordon", "Hamilton", "MacDonald", "McKenzie", "McLean", "Morrison", "Murray", "Reid", "Robertson", "Stewart", "Wilson"] },
  Sweden: { nationality: "Sweden", firstNames: ["Albin", "Alexander", "Anton", "Axel", "Elias", "Emil", "Erik", "Filip", "Gustav", "Hugo", "Isak", "Linus", "Ludvig", "Nils", "Oskar", "Viktor"], lastNames: ["Andersson", "Berg", "Bengtsson", "Eriksson", "Gustafsson", "Hansson", "Johansson", "Karlsson", "Larsson", "Lindberg", "Nilsson", "Olsson", "Persson", "Svensson", "Wallin", "Wikstrom"] },
  "Republic of Ireland": { nationality: "Republic of Ireland", firstNames: ["Adam", "Cian", "Conor", "Darragh", "Eoin", "Finn", "Jack", "James", "Liam", "Luke", "Michael", "Oisin", "Patrick", "Ronan", "Sean", "Shane"], lastNames: ["Brennan", "Burke", "Byrne", "Daly", "Doyle", "Fitzgerald", "Kelly", "Kennedy", "McCarthy", "Murphy", "Nolan", "O'Brien", "O'Connor", "O'Sullivan", "Ryan", "Walsh"] },
  Nigeria: { nationality: "Nigeria", firstNames: ["Ahmed", "Chidi", "Daniel", "Emeka", "Emmanuel", "Ifeanyi", "Isaac", "Kelechi", "Moses", "Samuel", "Seyi", "Tobi", "Victor", "Wilfred"], lastNames: ["Adebayo", "Adeyemi", "Akande", "Balogun", "Eze", "Iheanacho", "Iroegbunam", "Nwosu", "Obi", "Okafor", "Okeke", "Olise", "Onyeka", "Uche"] },
  Norway: { nationality: "Norway", firstNames: ["Aksel", "Andreas", "Emil", "Erik", "Henrik", "Jonas", "Kristian", "Magnus", "Marius", "Martin", "Ola", "Sander", "Tobias", "Vegard"], lastNames: ["Andersen", "Berg", "Dahl", "Hansen", "Haugen", "Johansen", "Karlsen", "Larsen", "Nilsen", "Olsen", "Pedersen", "Solberg", "Svendsen", "Tangen"] },
  Senegal: { nationality: "Senegal", firstNames: ["Abdou", "Aliou", "Cheikh", "Habib", "Ibrahima", "Idrissa", "Ismaila", "Mamadou", "Moussa", "Oumar", "Pape", "Sadio", "Saliou", "Youssou"], lastNames: ["Ba", "Cisse", "Diagne", "Diallo", "Diop", "Faye", "Gueye", "Kouyate", "Mane", "Ndiaye", "Sarr", "Seck", "Sow", "Sy"] },
  "Cote d'Ivoire": { nationality: "Cote d'Ivoire", firstNames: ["Adama", "Amadou", "Armand", "Didier", "Eric", "Franck", "Hamed", "Ibrahim", "Jean", "Karim", "Maxwel", "Nicolas", "Serge", "Wilfried"], lastNames: ["Akpa", "Bamba", "Bayo", "Coulibaly", "Diallo", "Diarra", "Fofana", "Kessie", "Kone", "Kouassi", "Pepe", "Traore", "Yao", "Zaha"] },
  "Northern Ireland": { nationality: "Northern Ireland", firstNames: ["Aaron", "Callum", "Conor", "Darren", "Ethan", "Glen", "Jamie", "Jordan", "Kyle", "Matthew", "Patrick", "Ryan", "Shane", "Tiernan"], lastNames: ["Baird", "Brown", "Campbell", "Clarke", "Donnelly", "Evans", "Ferguson", "Hughes", "McCann", "McLaughlin", "McNair", "O'Neill", "Thompson", "Wilson"] },
  Morocco: { nationality: "Morocco", firstNames: ["Achraf", "Amine", "Anas", "Bilal", "Hakim", "Hamza", "Ilias", "Ismael", "Mehdi", "Nabil", "Nayef", "Rayan", "Sofiane", "Youssef"], lastNames: ["Aboukhlal", "Amrabat", "Bennani", "Boufal", "El Idrissi", "En-Nesyri", "Hakimi", "Mansouri", "Mazraoui", "Saidi", "Tazi", "Ziyech", "Zouhair", "Zribi"] },
  Serbia: { nationality: "Serbia", firstNames: ["Aleksa", "Andrija", "Dusan", "Filip", "Luka", "Marko", "Milan", "Milos", "Nemanja", "Nikola", "Sasa", "Stefan", "Strahinja", "Uros"], lastNames: ["Ilic", "Jovanovic", "Lazic", "Markovic", "Milosevic", "Mitrovic", "Nikolic", "Pavlovic", "Petrovic", "Popovic", "Stankovic", "Stojanovic", "Vasic", "Vukovic"] },
  Switzerland: { nationality: "Switzerland", firstNames: ["Adrian", "Andrin", "Cedric", "Fabian", "Jan", "Joel", "Lars", "Leandro", "Luca", "Marco", "Noah", "Ruben", "Simon", "Yannick"], lastNames: ["Baumann", "Brunner", "Frei", "Keller", "Meier", "Muller", "Schmid", "Schneider", "Steiner", "Suter", "Weber", "Widmer", "Wolf", "Zimmermann"] },
  "United States": { nationality: "United States", firstNames: ["Aiden", "Brandon", "Caleb", "Cameron", "Christian", "Ethan", "Jack", "Jackson", "Jordan", "Logan", "Mason", "Noah", "Tyler", "Weston"], lastNames: ["Adams", "Brooks", "Cannon", "Carter", "Johnson", "Jones", "Long", "McKennie", "Miller", "Parks", "Reed", "Reynolds", "Robinson", "Turner"] },
  "Congo DR": { nationality: "Congo DR", firstNames: ["Aaron", "Cedric", "Chancel", "Dieumerci", "Gael", "Jackson", "Jonathan", "Jordan", "Samuel", "Theo", "Vital", "Yannick"], lastNames: ["Bakambu", "Bolasie", "Kabongo", "Kalala", "Kayembe", "Lukebakio", "Mabiala", "Mbemba", "Mpoku", "Muleka", "Muzinga", "Wissa"] }
};

const internationalWeights: WeightedNationality[] = [
  { nationality: "France", weight: 12 }, { nationality: "Brazil", weight: 12 },
  { nationality: "Netherlands", weight: 11 }, { nationality: "Spain", weight: 8 },
  { nationality: "Germany", weight: 7 }, { nationality: "Portugal", weight: 7 },
  { nationality: "Argentina", weight: 6 }, { nationality: "Belgium", weight: 6 },
  { nationality: "Italy", weight: 5 }, { nationality: "Denmark", weight: 5 },
  { nationality: "Sweden", weight: 4 }, { nationality: "Nigeria", weight: 4 },
  { nationality: "Norway", weight: 3 }, { nationality: "Senegal", weight: 3 },
  { nationality: "Cote d'Ivoire", weight: 3 }, { nationality: "Morocco", weight: 3 },
  { nationality: "Serbia", weight: 2 }, { nationality: "Switzerland", weight: 2 },
  { nationality: "United States", weight: 2 }, { nationality: "Congo DR", weight: 2 }
];

const homeNationWeights: WeightedNationality[] = [
  { nationality: "Wales", weight: 40 },
  { nationality: "Scotland", weight: 32 },
  { nationality: "Republic of Ireland", weight: 18 },
  { nationality: "Northern Ireland", weight: 10 }
];

const localityByLeagueLevel: Record<number, { england: number; homeNations: number; international: number }> = {
  1: { england: 78, homeNations: 17, international: 5 },
  2: { england: 70, homeNations: 18, international: 12 },
  3: { england: 61, homeNations: 18, international: 21 },
  4: { england: 52, homeNations: 17, international: 31 },
  5: { england: 42, homeNations: 13, international: 45 }
};

function weightedPick(items: WeightedNationality[], rng: RandomSource): string {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item.nationality;
  }
  return items[items.length - 1].nationality;
}

export function pickNationalityForLeague(level: number, rng: RandomSource): string {
  const mix = localityByLeagueLevel[level] ?? localityByLeagueLevel[1];
  const roll = rng() * 100;
  if (roll < mix.england) return "England";
  if (roll < mix.england + mix.homeNations) return weightedPick(homeNationWeights, rng);
  return weightedPick(internationalWeights, rng);
}

export function getNationalityProfile(nationality: string): NationalityProfile {
  return nationalityProfiles[nationality] ?? nationalityProfiles.England;
}
