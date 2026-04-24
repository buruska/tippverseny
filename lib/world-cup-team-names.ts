const hungarianTeamNames: Record<string, string> = {
  Algeria: "Algéria",
  Argentina: "Argentína",
  Australia: "Ausztrália",
  Austria: "Ausztria",
  Belgium: "Belgium",
  "Bosnia-Herzegovina": "Bosznia-Hercegovina",
  Brazil: "Brazília",
  Canada: "Kanada",
  "Cape Verde": "Zöld-foki Köztársaság",
  Colombia: "Kolumbia",
  Croatia: "Horvátország",
  "Curaçao": "Curaçao",
  "Czech Republic": "Csehország",
  "DR Congo": "Kongói DK",
  Ecuador: "Ecuador",
  Egypt: "Egyiptom",
  England: "Anglia",
  France: "Franciaország",
  Germany: "Németország",
  Ghana: "Ghána",
  Haiti: "Haiti",
  Iran: "Irán",
  Iraq: "Irak",
  "Ivory Coast": "Elefántcsontpart",
  Japan: "Japán",
  Jordan: "Jordánia",
  Mexico: "Mexikó",
  Morocco: "Marokkó",
  Netherlands: "Hollandia",
  "New Zealand": "Új-Zéland",
  Norway: "Norvégia",
  Panama: "Panama",
  Paraguay: "Paraguay",
  Portugal: "Portugália",
  Qatar: "Katar",
  "Saudi Arabia": "Szaúd-Arábia",
  Scotland: "Skócia",
  Senegal: "Szenegál",
  "South Africa": "Dél-Afrika",
  "South Korea": "Dél-Korea",
  Spain: "Spanyolország",
  Sweden: "Svédország",
  Switzerland: "Svájc",
  Tunisia: "Tunézia",
  Turkey: "Törökország",
  Uruguay: "Uruguay",
  USA: "Egyesült Államok",
  Uzbekistan: "Üzbegisztán",
};

const teamFlagCodes: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia-Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  "Curaçao": "cw",
  "Czech Republic": "cz",
  "DR Congo": "cd",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Uruguay: "uy",
  USA: "us",
  Uzbekistan: "uz",
};

export function getHungarianTeamName(name: string | null | undefined) {
  if (!name) {
    return "Ismeretlen csapat";
  }

  return hungarianTeamNames[name] ?? name;
}

export function getTeamFlagUrl(name: string | null | undefined) {
  if (!name) {
    return null;
  }

  const flagCode = teamFlagCodes[name];

  if (!flagCode) {
    return null;
  }

  return `https://flagcdn.com/w40/${flagCode}.png`;
}
