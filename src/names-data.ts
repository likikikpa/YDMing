/** Word lists for place names, one culture each. Written as words split on spaces to stay readable. */
const w = (list: string) => list.split(/\s+/).filter(Boolean);

export type Culture = "human" | "elven" | "dwarven" | "northern" | "southern";

/** What the ground under a settlement is like. */
export type Ground =
  | "plain"
  | "forest"
  | "mountain"
  | "desert"
  | "snow"
  | "swamp";

/** The words one culture builds names from. */
export interface Lexicon {
  /** Start of a name. */
  heads: string[];
  /** Ending of a name on any ground. */
  tails: string[];
  /** Endings that tell what ground or water a settlement is on. */
  byGround: Record<Ground, string[]>;
  coast: string[];
  river: string[];
  /** Words that put the name in a place, for names like "Port Alder". */
  titles: string[];
  /** Name starts that suit one kind of ground or the coast better than the general ones. */
  flavour?: Partial<Record<Ground | "coast", string[]>>;
}

export const HUMAN: Lexicon = {
  heads:
    w(`Ash Elder Raven Thorn Briar Mist Silver Oak Hollow Ember Wind Stone Gold
    Frost Green Amber Birch Black Bram Bright Cold Copper Crow Dun Eagle Elm Fair Fern
    Fox Gray Hart Hawk Heron High Holly Iron Ivy King Lark Lime Lynn Maple Marsh Mill
    Moss North Old Pike Quill Red Rook Rose Sage Salt Sand Swan Tall Wolf West White
    Wren Yew Alder Barley Bell Bishop Bold Bright Cairn Clay Crane Deer Dove Drake
    East Falcon Flint Gable Glen Goose Hazel Heath Hill Jay Juniper Kestrel Linden
    Lion Magpie Marten Morrow Otter Pear Plum Reed Ridge Sparrow Spring Stag Sun Teal
    Thistle Toad Vale Walnut Weasel Willow Wheat`),
  tails:
    w(`mere fall haven hold watch wick brook reach ford hollow crest gate ton stead
    field wood dale bury worth ham mouth marsh ridge stone bridge well hurst combe by
    thorpe stow wall way minster cliff moor lea`),
  byGround: {
    plain: w("field mead stead ton ley croft barrow acre"),
    forest: w("wood holt grove glade hurst shaw hollow thicket"),
    mountain: w("crag tor peak fell gap scar rock ridge"),
    desert: w("sand dune wells mesa wash"),
    snow: w("frost snow cold rime winter"),
    swamp: w("fen mire marsh moor bog sedge"),
  },
  coast: w("port haven mouth wick cove harbour strand bay ness head quay"),
  river: w("ford bridge mouth wade crossing ferry"),
  titles: w("Port Fort New Old Upper Lower Great Little Saint"),
  flavour: {
    forest: w(
      "Oak Ash Elm Yew Fern Holly Birch Hazel Maple Linden Fox Stag Alder Ivy",
    ),
    mountain: w("Stone Iron High Crag Gray Eagle Hawk Flint Cairn Rook Cold"),
    desert: w("Sun Dust Dry Salt Amber Red Sand Bleach Scorch Mirage"),
    snow: w("Frost Rime White Winter Hoar Cold Pale Bitter"),
    swamp: w("Reed Moss Toad Heron Black Willow Crane Marsh Otter Sedge"),
    coast: w("Salt Gull Wave Swan Heron Shell Tide Net Anchor Mast Pike"),
  },
};

export const ELVEN: Lexicon = {
  heads:
    w(`Ael Ith Syl Lor Mir Cal Eld Fae Gal Ilv Nim Thal Vael Ean Ar Cel Lin Sael Alth
    Elen Aen Eri Fin Gil Hael Iri Kael Lae Mael Nael Ola Per Quel Rae Sil Tae Ula Vir
    Wyn Yav Zeph Anor Belen Cael Dae Eil
    Amar Bel Cir Dael Eorn Fael Gael Hesp Ilan Jael Kel Lael Myr Nol Oriel Pael Quil Rhae Sael Tiel Uri Vesh Wael Xan Yriel`),
  tails:
    w(`iel wen thas ondel aril ael oth ia inor eth ara ion ilas ael ora anor ir elle
    thil mar duin lond`),
  byGround: {
    plain: w("eldoril aldor vael"),
    forest: w("sylva thelas orrel"),
    mountain: w("karith theron vaen orrel"),
    desert: w("ashar sael dunar"),
    snow: w("hael rimil ysil"),
    swamp: w("nenn velis"),
  },
  coast: w("lir nae ilm shael ael"),
  river: w("ilis naen siril"),
  titles: w("Vel Aer Ilar Thas"),
};

export const DWARVEN: Lexicon = {
  heads:
    w(`Khaz Dun Brom Kar Thor Grim Dur Bel Morg Gund Bar Dolg Fal Hur Kel Mor Nor Rag
    Stor Tarn Vor Zak Ur Bor Dwal Eld Fund Glim Har Ing Jor Krag Lod Mur Orm Rok Sor Thrain
    Ulf Varn Wul
    Adar Bael Cor Dren Fen Gor Hald Isk Jar Kor Lur Mak Nal Ost Pek Quar Ros Skol Ul Var Wen Yor Zug Alm Bruk Edd Flint Grum Hamm Iro Kron Lorn Magn Nur Oth Rud Tung Urd Volk Wyr`),
  tails:
    w(`dun heim delve forge deep hold gard mar rok zar hall holm drak grund kaz bor
    stein ar dum
    kor brun gar helm vald ruk thar norr`),
  byGround: {
    plain: w("hall steading mill"),
    forest: w("hollow root"),
    mountain: w("delve deep forge hold khaz"),
    desert: w("zar dun"),
    snow: w("stein rime"),
    swamp: w("mire bor"),
  },
  coast: w("hold quay"),
  river: w("ford bridge"),
  titles: w("Deep High Under Iron Stone Black Red Gold Grim Old"),
};

export const NORTHERN: Lexicon = {
  heads:
    w(`Frost Ulf Bjorn Sig Ragn Hel Skarn Thrym Vig Eir Hal Orm Sten Brand Kjel Aud Dag
    Gunn Hrolf Ivar Jarl Knut Leif Njal Odd Rolf Svein Tor Bard Erik Fenr Geir Hakon
    Ingvar Kol Mord Olaf Runa Skog Tyr Vald
    Alf Arn Bjarn Eid Frey Haf Jor Ketil Lodin Mar Orn Pal Torv Ulv Vagn Yng Asg Dyr Finn Grim Hrafn Isa Jot Kar
    Aki Bolli Cnut Dross Egil Floki Gorm Haldor Illug Jostein Kari Ljot Magni Naddod Olvir Ottar Pjodar Ragnar Sigurd Thorgil Ulfar Vermund Yngvar`),
  tails:
    w(`vik by stad fjord holm ness dal berg heim thorp sund gard haug ey fell vang
    mark lund borg skar
    tun set land mo vag nes bu`),
  byGround: {
    plain: w("vang mark lund by"),
    forest: w("skog lund"),
    mountain: w("berg fell haug skar"),
    desert: w("sand"),
    snow: w("frost isa hvit"),
    swamp: w("myr"),
  },
  coast: w("vik fjord sund ness holm ey"),
  river: w("elv ford brygge"),
  titles: w("Stor Lille Nord Sor Ytre Indre Ovre Nedre"),
};

export const SOUTHERN: Lexicon = {
  heads: w(`Alba Cor Mar Tor Sol Vero Val Ser Lum Pira Ori Cala Vit Amar Bel Cas
    Dor Fel Gio Lav Nev Oliv Rav Ter Aure Bora Cima Dolce Etru Fiora Gala Lido Mora Nera
    Opal Pesca Quira Rosa Sera Tala Umbra Vela
    Arda Bria Cesa Dina Elva Fano Gema Hera Iva Jola Kora Lena Mera Nila Olva Pera Rima Sana Tiva Urbi Vena Zora Alto Bosa Dona Aqua Ferra Nova`),
  tails: w(`ia ora ento ino ana mar oro ella ona ezza ara ago ico ea ata ona
    ello etta
    iva ena ore elo ano uro`),
  byGround: {
    plain: w("campo prato valle"),
    forest: w("selva bosco"),
    mountain: w("monte rocca cima"),
    desert: w("sabbia arida"),
    snow: w("neve alta"),
    swamp: w("palude"),
  },
  coast: w("porto marina riva spiaggia"),
  river: w("ponte fiume guado"),
  titles: w("Porto Castel Monte Villa Santa"),
};

export const LEXICONS: Record<Culture, Lexicon> = {
  human: HUMAN,
  elven: ELVEN,
  dwarven: DWARVEN,
  northern: NORTHERN,
  southern: SOUTHERN,
};

export const CULTURES = Object.keys(LEXICONS) as Culture[];

/** People's names for "Raven's Rest" and "Tomb of Kael" style names. */
export const PEOPLE =
  w(`Aldric Morwen Thessaly Bram Ysolde Corwin Edda Garrick Hild Isen Joss
  Kael Liora Marek Nessa Orin Petra Quinn Rurik Sable Tamsin Ulric Vesper Wynn Yara
  Zeno Alder Brisa Cato Dara Emmet Fenn Greta Hob Ilse`);

/** Words for "Raven's Rest": a creature or trade, then a place. */
export const OWNERS =
  w(`Raven Fox King Queen Miller Widow Hunter Piper Drover Tinker Bishop
  Stag Crow Wolf Smith Weaver Shepherd Fisher Ferryman Hermit Pilgrim Lord Lady Cooper
  Thatcher Mason Tanner`);
export const PLACES =
  w(`Rest Landing Crossing Hollow End Hope Watch Stand Rise Folly Keep
  Reach Fall Mark Step Gate Hold Refuge Hearth`);

/** Dungeon names: an adjective and a building, or a person and their grave. */
export const DUNGEON_ADJECTIVES =
  w(`Hollow Sunken Forgotten Weeping Black Pale Drowned
  Broken Silent Gilded Cursed Hungry Bleeding Whispering Burning Frozen Lost Hidden
  Shattered Sleeping Bitter Crimson Withered`);
export const DUNGEON_PLACES: Record<Culture, string[]> = {
  human: w(
    "Crypt Barrow Mines Caverns Vault Warren Keep Catacombs Sanctum Pit Cellar",
  ),
  elven: w("Spire Grove Ruins Sanctum Hall Court Vault"),
  dwarven: w("Delve Mines Forge Hall Vault Deeps Halls"),
  northern: w("Barrow Hall Cairn Crypt Mound Longhouse"),
  southern: w("Catacombs Temple Cistern Villa Crypt Ruins"),
};
export const DUNGEON_GRAVES = w("Tomb Grave Barrow Vault Shrine Cairn Crypt");
