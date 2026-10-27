// Magasins Trinity, enregistrés en base par le seed et par prisma/sync-stores.ts.
// Adresses fictives dans de vraies villes ; coordonnées du quartier, pour trier les magasins par distance.

export interface StoreData {
  slug: string;
  name: string;
  street: string;
  zipCode: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  phone?: string;
  hours: string;
}

// Magasin des commandes passées avant le choix du magasin
export const HISTORIC_STORE_SLUG = "rennes-epitech";

const WEEK = "Lun.–sam. 8h30–20h30";
const WEEK_SUNDAY = "Lun.–sam. 8h30–20h, dim. 9h–12h30";
const LATE = "Lun.–sam. 8h–21h, dim. 9h–13h";
const SHORT = "Lun.–sam. 9h–19h30";

type Region = Omit<StoreData, "region">[];

const BRETAGNE: Region = [
  { slug: HISTORIC_STORE_SLUG, name: "Trinity Rennes Epitech", street: "19-22 boulevard Saint-Conwoïon", zipCode: "35000", city: "Rennes", latitude: 48.1003, longitude: -1.6696, phone: "02 57 22 08 54", hours: WEEK },
  { slug: "rennes-cesson", name: "Trinity Rennes Cesson", street: "4 rue de la Rigourdière", zipCode: "35510", city: "Cesson-Sévigné", latitude: 48.1211, longitude: -1.6031, hours: LATE },
  { slug: "rennes-saint-gregoire", name: "Trinity Rennes Saint-Grégoire", street: "12 rue du Bas Village", zipCode: "35760", city: "Saint-Grégoire", latitude: 48.1513, longitude: -1.6847, hours: WEEK_SUNDAY },
  { slug: "saint-malo", name: "Trinity Saint-Malo", street: "8 avenue de Marville", zipCode: "35400", city: "Saint-Malo", latitude: 48.6436, longitude: -2.0083, hours: WEEK_SUNDAY },
  { slug: "brest", name: "Trinity Brest Kergaradec", street: "21 rue Jean-Marie Le Bris", zipCode: "29200", city: "Brest", latitude: 48.4245, longitude: -4.4732, hours: WEEK },
  { slug: "quimper", name: "Trinity Quimper", street: "3 route de Bénodet", zipCode: "29000", city: "Quimper", latitude: 47.9781, longitude: -4.0936, hours: WEEK },
  { slug: "lorient", name: "Trinity Lorient", street: "15 boulevard Cosmao Dumanoir", zipCode: "56100", city: "Lorient", latitude: 47.7483, longitude: -3.37, hours: SHORT },
  { slug: "vannes", name: "Trinity Vannes", street: "6 avenue du Président Wilson", zipCode: "56000", city: "Vannes", latitude: 47.6582, longitude: -2.7608, hours: WEEK_SUNDAY },
  { slug: "saint-brieuc", name: "Trinity Saint-Brieuc", street: "27 rue de Brest", zipCode: "22000", city: "Saint-Brieuc", latitude: 48.5141, longitude: -2.7603, hours: WEEK },
];

const PAYS_DE_LA_LOIRE: Region = [
  { slug: "nantes-beaujoire", name: "Trinity Nantes Beaujoire", street: "2 route de Saint-Joseph", zipCode: "44300", city: "Nantes", latitude: 47.256, longitude: -1.524, hours: LATE },
  { slug: "nantes-reze", name: "Trinity Nantes Rezé", street: "18 rue Jean Jaurès", zipCode: "44400", city: "Rezé", latitude: 47.191, longitude: -1.569, hours: WEEK_SUNDAY },
  { slug: "saint-nazaire", name: "Trinity Saint-Nazaire", street: "9 avenue de la République", zipCode: "44600", city: "Saint-Nazaire", latitude: 47.2735, longitude: -2.2138, hours: WEEK },
  { slug: "angers", name: "Trinity Angers", street: "11 boulevard du Roi René", zipCode: "49000", city: "Angers", latitude: 47.4784, longitude: -0.5632, hours: WEEK },
  { slug: "le-mans", name: "Trinity Le Mans", street: "23 avenue du Général Leclerc", zipCode: "72000", city: "Le Mans", latitude: 48.0061, longitude: 0.1996, hours: WEEK_SUNDAY },
  { slug: "laval", name: "Trinity Laval", street: "5 rue de Bretagne", zipCode: "53000", city: "Laval", latitude: 48.0707, longitude: -0.7734, hours: SHORT },
  { slug: "la-roche-sur-yon", name: "Trinity La Roche-sur-Yon", street: "14 boulevard Aristide Briand", zipCode: "85000", city: "La Roche-sur-Yon", latitude: 46.6705, longitude: -1.426, hours: WEEK },
];

const NORMANDIE: Region = [
  { slug: "caen", name: "Trinity Caen", street: "7 avenue de la Côte de Nacre", zipCode: "14000", city: "Caen", latitude: 49.2003, longitude: -0.3617, hours: WEEK_SUNDAY },
  { slug: "rouen", name: "Trinity Rouen", street: "31 rue Saint-Sever", zipCode: "76100", city: "Rouen", latitude: 49.4342, longitude: 1.0868, hours: WEEK },
  { slug: "le-havre", name: "Trinity Le Havre", street: "40 cours de la République", zipCode: "76600", city: "Le Havre", latitude: 49.4944, longitude: 0.1079, hours: WEEK },
  { slug: "cherbourg", name: "Trinity Cherbourg", street: "2 quai de l'Entrepôt", zipCode: "50100", city: "Cherbourg-en-Cotentin", latitude: 49.6337, longitude: -1.6222, hours: SHORT },
  { slug: "evreux", name: "Trinity Évreux", street: "16 rue Joséphine", zipCode: "27000", city: "Évreux", latitude: 49.0241, longitude: 1.1508, hours: WEEK },
];

const ILE_DE_FRANCE: Region = [
  { slug: "paris-15", name: "Trinity Paris Convention", street: "62 rue de la Convention", zipCode: "75015", city: "Paris", latitude: 48.8417, longitude: 2.2995, hours: LATE },
  { slug: "paris-11", name: "Trinity Paris Oberkampf", street: "88 rue Oberkampf", zipCode: "75011", city: "Paris", latitude: 48.865, longitude: 2.3773, hours: LATE },
  { slug: "paris-18", name: "Trinity Paris Jules Joffrin", street: "35 rue Ordener", zipCode: "75018", city: "Paris", latitude: 48.8925, longitude: 2.3444, hours: LATE },
  { slug: "paris-13", name: "Trinity Paris Tolbiac", street: "120 rue de Tolbiac", zipCode: "75013", city: "Paris", latitude: 48.8266, longitude: 2.3573, hours: LATE },
  { slug: "boulogne", name: "Trinity Boulogne-Billancourt", street: "54 route de la Reine", zipCode: "92100", city: "Boulogne-Billancourt", latitude: 48.8397, longitude: 2.2399, hours: WEEK_SUNDAY },
  { slug: "versailles", name: "Trinity Versailles", street: "10 rue des Chantiers", zipCode: "78000", city: "Versailles", latitude: 48.7983, longitude: 2.1376, hours: WEEK_SUNDAY },
  { slug: "creteil", name: "Trinity Créteil", street: "3 avenue du Général de Gaulle", zipCode: "94000", city: "Créteil", latitude: 48.7904, longitude: 2.4556, hours: WEEK },
  { slug: "saint-denis", name: "Trinity Saint-Denis", street: "25 rue de la République", zipCode: "93200", city: "Saint-Denis", latitude: 48.9362, longitude: 2.3574, hours: WEEK },
  { slug: "noisy-le-grand", name: "Trinity Noisy-le-Grand", street: "6 allée du Ballon", zipCode: "93160", city: "Noisy-le-Grand", latitude: 48.8486, longitude: 2.5528, hours: WEEK },
  { slug: "cergy", name: "Trinity Cergy", street: "13 boulevard de l'Oise", zipCode: "95000", city: "Cergy", latitude: 49.0364, longitude: 2.0761, hours: WEEK },
  { slug: "evry", name: "Trinity Évry-Courcouronnes", street: "8 cours Blaise Pascal", zipCode: "91000", city: "Évry-Courcouronnes", latitude: 48.629, longitude: 2.441, hours: WEEK },
];

const HAUTS_DE_FRANCE: Region = [
  { slug: "lille", name: "Trinity Lille Vauban", street: "47 rue Nationale", zipCode: "59000", city: "Lille", latitude: 50.6338, longitude: 3.0547, hours: LATE },
  { slug: "villeneuve-d-ascq", name: "Trinity Villeneuve-d'Ascq", street: "2 boulevard de Valmy", zipCode: "59650", city: "Villeneuve-d'Ascq", latitude: 50.6233, longitude: 3.145, hours: WEEK },
  { slug: "amiens", name: "Trinity Amiens", street: "19 rue de Noyon", zipCode: "80000", city: "Amiens", latitude: 49.8919, longitude: 2.3022, hours: WEEK },
  { slug: "dunkerque", name: "Trinity Dunkerque", street: "4 place Jean Bart", zipCode: "59140", city: "Dunkerque", latitude: 51.0343, longitude: 2.3768, hours: SHORT },
  { slug: "arras", name: "Trinity Arras", street: "11 rue Gambetta", zipCode: "62000", city: "Arras", latitude: 50.291, longitude: 2.7775, hours: WEEK },
];

const GRAND_EST: Region = [
  { slug: "strasbourg", name: "Trinity Strasbourg Neudorf", street: "30 route du Polygone", zipCode: "67100", city: "Strasbourg", latitude: 48.5682, longitude: 7.7605, hours: WEEK },
  { slug: "reims", name: "Trinity Reims", street: "9 boulevard Lundy", zipCode: "51100", city: "Reims", latitude: 49.2583, longitude: 4.0317, hours: WEEK_SUNDAY },
  { slug: "metz", name: "Trinity Metz", street: "22 rue Serpenoise", zipCode: "57000", city: "Metz", latitude: 49.1167, longitude: 6.1727, hours: WEEK },
  { slug: "nancy", name: "Trinity Nancy", street: "5 rue Saint-Jean", zipCode: "54000", city: "Nancy", latitude: 48.6908, longitude: 6.1784, hours: WEEK },
  { slug: "mulhouse", name: "Trinity Mulhouse", street: "14 avenue de Colmar", zipCode: "68100", city: "Mulhouse", latitude: 47.7508, longitude: 7.3359, hours: SHORT },
  { slug: "troyes", name: "Trinity Troyes", street: "8 boulevard Gambetta", zipCode: "10000", city: "Troyes", latitude: 48.2973, longitude: 4.0744, hours: WEEK },
];

const BOURGOGNE_FRANCHE_COMTE: Region = [
  { slug: "dijon", name: "Trinity Dijon", street: "17 boulevard de Sévigné", zipCode: "21000", city: "Dijon", latitude: 47.3227, longitude: 5.0298, hours: WEEK_SUNDAY },
  { slug: "besancon", name: "Trinity Besançon", street: "6 rue de Vesoul", zipCode: "25000", city: "Besançon", latitude: 47.2464, longitude: 6.0227, hours: WEEK },
];

const CENTRE_VAL_DE_LOIRE: Region = [
  { slug: "tours", name: "Trinity Tours", street: "28 boulevard Heurteloup", zipCode: "37000", city: "Tours", latitude: 47.3895, longitude: 0.6928, hours: WEEK_SUNDAY },
  { slug: "orleans", name: "Trinity Orléans", street: "12 rue de la République", zipCode: "45000", city: "Orléans", latitude: 47.9042, longitude: 1.9058, hours: WEEK },
  { slug: "bourges", name: "Trinity Bourges", street: "3 avenue Jean Jaurès", zipCode: "18000", city: "Bourges", latitude: 47.081, longitude: 2.3988, hours: SHORT },
  { slug: "chartres", name: "Trinity Chartres", street: "7 place des Épars", zipCode: "28000", city: "Chartres", latitude: 48.4439, longitude: 1.489, hours: WEEK },
];

const NOUVELLE_AQUITAINE: Region = [
  { slug: "bordeaux-bastide", name: "Trinity Bordeaux Bastide", street: "15 avenue Thiers", zipCode: "33100", city: "Bordeaux", latitude: 44.843, longitude: -0.556, hours: LATE },
  { slug: "bordeaux-merignac", name: "Trinity Bordeaux Mérignac", street: "40 avenue de la Marne", zipCode: "33700", city: "Mérignac", latitude: 44.8386, longitude: -0.6436, hours: WEEK_SUNDAY },
  { slug: "poitiers", name: "Trinity Poitiers", street: "9 boulevard du Grand Cerf", zipCode: "86000", city: "Poitiers", latitude: 46.5838, longitude: 0.3335, hours: WEEK },
  { slug: "la-rochelle", name: "Trinity La Rochelle", street: "21 avenue de Rompsay", zipCode: "17000", city: "La Rochelle", latitude: 46.1603, longitude: -1.1511, hours: WEEK_SUNDAY },
  { slug: "limoges", name: "Trinity Limoges", street: "14 avenue Garibaldi", zipCode: "87000", city: "Limoges", latitude: 45.8336, longitude: 1.2611, hours: WEEK },
  { slug: "angouleme", name: "Trinity Angoulême", street: "6 rue de Paris", zipCode: "16000", city: "Angoulême", latitude: 45.6484, longitude: 0.1562, hours: SHORT },
  { slug: "pau", name: "Trinity Pau", street: "18 avenue Jean Mermoz", zipCode: "64000", city: "Pau", latitude: 43.3075, longitude: -0.3656, hours: WEEK },
  { slug: "bayonne", name: "Trinity Bayonne", street: "5 allées Marines", zipCode: "64100", city: "Bayonne", latitude: 43.4929, longitude: -1.4748, hours: WEEK_SUNDAY },
];

const OCCITANIE: Region = [
  { slug: "toulouse-compans", name: "Trinity Toulouse Compans", street: "24 boulevard de la Marquette", zipCode: "31000", city: "Toulouse", latitude: 43.6105, longitude: 1.4335, hours: LATE },
  { slug: "toulouse-labege", name: "Trinity Toulouse Labège", street: "3 rue de l'Ancienne Grange", zipCode: "31670", city: "Labège", latitude: 43.53, longitude: 1.513, hours: WEEK_SUNDAY },
  { slug: "montpellier", name: "Trinity Montpellier Antigone", street: "11 avenue du Pirée", zipCode: "34000", city: "Montpellier", latitude: 43.6085, longitude: 3.8885, hours: LATE },
  { slug: "nimes", name: "Trinity Nîmes", street: "16 avenue Jean Jaurès", zipCode: "30900", city: "Nîmes", latitude: 43.8292, longitude: 4.3521, hours: WEEK },
  { slug: "perpignan", name: "Trinity Perpignan", street: "8 avenue du Maréchal Leclerc", zipCode: "66000", city: "Perpignan", latitude: 42.6887, longitude: 2.8948, hours: WEEK_SUNDAY },
  { slug: "beziers", name: "Trinity Béziers", street: "4 avenue Saint-Saëns", zipCode: "34500", city: "Béziers", latitude: 43.3442, longitude: 3.2158, hours: SHORT },
  { slug: "albi", name: "Trinity Albi", street: "13 avenue Gambetta", zipCode: "81000", city: "Albi", latitude: 43.9289, longitude: 2.1464, hours: SHORT },
];

const AUVERGNE_RHONE_ALPES: Region = [
  { slug: "lyon-part-dieu", name: "Trinity Lyon Part-Dieu", street: "45 rue de la Villette", zipCode: "69003", city: "Lyon", latitude: 45.7605, longitude: 4.859, hours: LATE },
  { slug: "lyon-vaise", name: "Trinity Lyon Vaise", street: "8 rue de Bourgogne", zipCode: "69009", city: "Lyon", latitude: 45.774, longitude: 4.805, hours: LATE },
  { slug: "villeurbanne", name: "Trinity Villeurbanne", street: "60 cours Émile Zola", zipCode: "69100", city: "Villeurbanne", latitude: 45.7719, longitude: 4.8902, hours: WEEK_SUNDAY },
  { slug: "grenoble", name: "Trinity Grenoble", street: "19 cours Berriat", zipCode: "38000", city: "Grenoble", latitude: 45.1885, longitude: 5.7135, hours: WEEK },
  { slug: "saint-etienne", name: "Trinity Saint-Étienne", street: "12 rue Bergson", zipCode: "42000", city: "Saint-Étienne", latitude: 45.4469, longitude: 4.3872, hours: WEEK },
  { slug: "clermont-ferrand", name: "Trinity Clermont-Ferrand", street: "7 avenue de la République", zipCode: "63100", city: "Clermont-Ferrand", latitude: 45.7891, longitude: 3.0985, hours: WEEK },
  { slug: "annecy", name: "Trinity Annecy", street: "10 avenue de Genève", zipCode: "74000", city: "Annecy", latitude: 45.9112, longitude: 6.1335, hours: WEEK_SUNDAY },
  { slug: "chambery", name: "Trinity Chambéry", street: "5 rue de la Banque", zipCode: "73000", city: "Chambéry", latitude: 45.5646, longitude: 5.9178, hours: SHORT },
  { slug: "valence", name: "Trinity Valence", street: "21 avenue Victor Hugo", zipCode: "26000", city: "Valence", latitude: 44.9254, longitude: 4.8924, hours: WEEK },
];

const PROVENCE_ALPES_COTE_D_AZUR: Region = [
  { slug: "marseille-prado", name: "Trinity Marseille Prado", street: "112 avenue du Prado", zipCode: "13008", city: "Marseille", latitude: 43.27, longitude: 5.395, hours: LATE },
  { slug: "marseille-la-valentine", name: "Trinity Marseille La Valentine", street: "6 route de la Sablière", zipCode: "13011", city: "Marseille", latitude: 43.293, longitude: 5.483, hours: WEEK_SUNDAY },
  { slug: "aix-en-provence", name: "Trinity Aix-en-Provence", street: "15 avenue des Belges", zipCode: "13100", city: "Aix-en-Provence", latitude: 43.5263, longitude: 5.4454, hours: WEEK },
  { slug: "toulon", name: "Trinity Toulon", street: "9 avenue de la Victoire", zipCode: "83000", city: "Toulon", latitude: 43.1242, longitude: 5.928, hours: WEEK },
  { slug: "nice", name: "Trinity Nice Libération", street: "28 avenue Malausséna", zipCode: "06000", city: "Nice", latitude: 43.7136, longitude: 7.2618, hours: LATE },
  { slug: "cannes", name: "Trinity Cannes", street: "4 boulevard Carnot", zipCode: "06400", city: "Cannes", latitude: 43.5578, longitude: 7.0123, hours: WEEK_SUNDAY },
  { slug: "avignon", name: "Trinity Avignon", street: "17 route de Lyon", zipCode: "84000", city: "Avignon", latitude: 43.9493, longitude: 4.8055, hours: WEEK },
];

const CORSE: Region = [
  { slug: "ajaccio", name: "Trinity Ajaccio", street: "3 cours Napoléon", zipCode: "20000", city: "Ajaccio", latitude: 41.9192, longitude: 8.7386, hours: SHORT },
];

const REGIONS: [string, Region][] = [
  ["Bretagne", BRETAGNE],
  ["Pays de la Loire", PAYS_DE_LA_LOIRE],
  ["Normandie", NORMANDIE],
  ["Île-de-France", ILE_DE_FRANCE],
  ["Hauts-de-France", HAUTS_DE_FRANCE],
  ["Grand Est", GRAND_EST],
  ["Bourgogne-Franche-Comté", BOURGOGNE_FRANCHE_COMTE],
  ["Centre-Val de Loire", CENTRE_VAL_DE_LOIRE],
  ["Nouvelle-Aquitaine", NOUVELLE_AQUITAINE],
  ["Occitanie", OCCITANIE],
  ["Auvergne-Rhône-Alpes", AUVERGNE_RHONE_ALPES],
  ["Provence-Alpes-Côte d'Azur", PROVENCE_ALPES_COTE_D_AZUR],
  ["Corse", CORSE],
];

export const STORES: StoreData[] = REGIONS.flatMap(([region, stores]) => stores.map((store) => ({ ...store, region })));
