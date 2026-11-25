// Boshlang'ich mahsulotlar: baza bo'sh bo'lsa avtomatik yoziladi.
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const SEED_PRODUCTS = [
  {
    name: 'Margarita',
    description: 'Klassika hech qachon eskirmaydi: yupqa xamir, pomidor sousi va cho‘ziluvchan mozzarella.',
    ingredients: ['Pomidor sousi', 'Mozzarella pishlog‘i', 'Yangi rayhon', 'Zaytun moyi'],
    imageUrl: img('photo-1574071318508-1cdbab80d002'),
    oldPrice: 75000,
    newPrice: 59000,
    category: 'Klassik',
  },
  {
    name: 'Peperoni',
    description: 'Achchiqroq peperoni kolbasasi va ko‘p pishloq — eng ko‘p buyurtma qilinadigan pizza.',
    ingredients: ['Pomidor sousi', 'Mozzarella pishlog‘i', 'Peperoni kolbasasi', 'Oregano'],
    imageUrl: img('photo-1628840042765-356cda07504e'),
    oldPrice: 89000,
    newPrice: 69000,
    category: 'Go‘shtli',
  },
  {
    name: 'Qazi pizza',
    description: 'Milliy ta’m va Italiya uslubi bir joyda: haqiqiy qazi, piyoz va qaymoqli sous.',
    ingredients: ['Qaymoqli sous', 'Mozzarella pishlog‘i', 'Qazi', 'Qizil piyoz', 'Bolgar qalampiri'],
    imageUrl: img('photo-1565299624946-b28f40a0ae38'),
    oldPrice: 99000,
    newPrice: 79000,
    category: 'Milliy',
  },
  {
    name: 'Pishloqli',
    description: 'To‘rt xil pishloq uyg‘unligi — pishloq ishqibozlari uchun.',
    ingredients: ['Qaymoqli sous', 'Mozzarella', 'Parmezan', 'Cheddar', 'Gorgonzola'],
    imageUrl: img('photo-1513104890138-7c749659a591'),
    oldPrice: 95000,
    newPrice: 72000,
    category: 'Pishloqli',
  },
  {
    name: 'Coca-Cola 0.5 L',
    description: 'Muzdek Coca-Cola — pizzaga eng yaxshi hamroh.',
    ingredients: [],
    imageUrl: img('photo-1554866585-cd94860890b7'),
    oldPrice: 10000,
    newPrice: 5000,
    category: 'Ichimlik',
  },
  ...EXTRA_PRODUCTS(),
];

/** Burger, hot-dog, lavash, gazaklar, desert va ichimliklar. */
function EXTRA_PRODUCTS() {
  return [
    // ---------- BURGER ----------
    {
      name: 'Klassik burger',
      description: 'Shirali mol go‘shtli kotlet, yangi sabzavotlar va maxsus sous — oddiy, lekin mukammal.',
      ingredients: ['Mol go‘shti kotleti', 'Pomidor', 'Salat bargi', 'Bodring', 'Piyoz', 'Maxsus sous'],
      imageUrl: img('photo-1571091718767-18b5b1457add'),
      oldPrice: 45000,
      newPrice: 35000,
      category: 'Burger',
    },
    {
      name: 'Chizburger',
      description: 'Eriydigan cheddar pishlog‘i bilan qo‘shaloq lazzat.',
      ingredients: ['Mol go‘shti kotleti', 'Cheddar pishlog‘i', 'Tuzlangan bodring', 'Piyoz', 'Ketchup va xantal'],
      imageUrl: img('photo-1568901346375-23c9450c58cd'),
      oldPrice: 49000,
      newPrice: 39000,
      category: 'Burger',
    },
    {
      name: 'Dabl burger',
      description: 'Ikki qavat kotlet, ikki qavat pishloq va dudlangan bekon — haqiqiy och odamlar uchun.',
      ingredients: ['2 ta mol go‘shti kotleti', '2 qavat cheddar', 'Dudlangan mol bekoni', 'Karamellangan piyoz', 'BBQ sous'],
      imageUrl: img('photo-1553979459-d2229ba7433b'),
      oldPrice: 69000,
      newPrice: 55000,
      category: 'Burger',
    },
    {
      name: 'Burger kombo',
      description: 'Klassik burger + kartoshka fri — alohida olgandan arzonroq.',
      ingredients: ['Klassik burger', 'Kartoshka fri', 'Ketchup'],
      imageUrl: img('photo-1594212699903-ec8a3eca50f5'),
      oldPrice: 65000,
      newPrice: 47000,
      category: 'Burger',
    },

    // ---------- HOT-DOG ----------
    {
      name: 'Klassik hot-dog',
      description: 'Yumshoq bulochka, shirali sosiska, ketchup va xantal.',
      ingredients: ['Bulochka', 'Mol go‘shtli sosiska', 'Ketchup', 'Xantal'],
      imageUrl: img('photo-1599599810694-b5b37304c041'),
      oldPrice: 25000,
      newPrice: 19000,
      category: 'Hot-dog',
    },
    {
      name: 'Assorti hot-dog',
      description: 'Pomidor, piyoz, ko‘katlar va ikki xil sous bilan to‘yimli hot-dog.',
      ingredients: ['Bulochka', 'Sosiska', 'Pomidor', 'Qizil piyoz', 'Ko‘katlar', 'Mayonez', 'Ketchup'],
      imageUrl: img('photo-1619740455993-9e612b1af08a'),
      oldPrice: 32000,
      newPrice: 25000,
      category: 'Hot-dog',
    },

    // ---------- LAVASH ----------
    {
      name: 'Tovuqli lavash',
      description: 'Yupqa lavashga o‘ralgan grilda pishgan tovuq va yangi sabzavotlar.',
      ingredients: ['Lavash', 'Tovuq go‘shti', 'Karam', 'Pomidor', 'Bodring', 'Sarimsoqli sous'],
      imageUrl: img('photo-1626700051175-6818013e1d4f'),
      oldPrice: 38000,
      newPrice: 29000,
      category: 'Lavash',
    },
    {
      name: 'Tovuqli shaurma',
      description: 'Ziravorli tovuq, kartoshka fri va tuzlangan sabzavotlar — likopchada.',
      ingredients: ['Tovuq go‘shti', 'Kartoshka fri', 'Tuzlangan piyoz', 'Ko‘katlar', 'Sarimsoqli sous'],
      imageUrl: img('photo-1529006557810-274b9b2fc783'),
      oldPrice: 45000,
      newPrice: 36000,
      category: 'Lavash',
    },

    // ---------- GAZAKLAR ----------
    {
      name: 'Kartoshka fri',
      description: 'Tashqarisi qarsildoq, ichi yumshoq oltin rang kartoshka.',
      ingredients: ['Kartoshka', 'Tuz', 'Ketchup'],
      imageUrl: img('photo-1585109649139-366815a0d713'),
      oldPrice: 20000,
      newPrice: 15000,
      category: 'Gazaklar',
    },
    {
      name: 'Tovuq strips (6 dona)',
      description: 'Qarsildoq qobiqdagi tovuq filesi bo‘laklari va sarimsoqli sous.',
      ingredients: ['Tovuq filesi', 'Qarsildoq panirovka', 'Sarimsoqli sous'],
      imageUrl: img('photo-1562967914-608f82629710'),
      oldPrice: 38000,
      newPrice: 29000,
      category: 'Gazaklar',
    },
    {
      name: 'Qarsildoq tovuq (4 dona)',
      description: 'Achchiq ziravorlar bilan qovurilgan tovuq oyoqchalari.',
      ingredients: ['Tovuq oyoqchalari', 'Achchiq ziravorlar', 'Panirovka'],
      imageUrl: img('photo-1626082927389-6cd097cdc6ec'),
      oldPrice: 42000,
      newPrice: 34000,
      category: 'Gazaklar',
    },

    // ---------- DESERT ----------
    {
      name: 'Shokoladli tort',
      description: 'Uch qavatli shokoladli tort bo‘lagi — qahva yoki choy bilan zo‘r.',
      ingredients: ['Shokoladli biskvit', 'Shokoladli krem', 'Kakao'],
      imageUrl: img('photo-1578985545062-69928b1d9587'),
      oldPrice: 28000,
      newPrice: 22000,
      category: 'Desert',
    },
    {
      name: 'Donutlar (3 dona)',
      description: 'Rangli sepma va shokolad glazurli yumshoq donutlar.',
      ingredients: ['Xamir', 'Shokolad glazuri', 'Rangli sepma'],
      imageUrl: img('photo-1551024601-bec78aea704b'),
      oldPrice: 30000,
      newPrice: 24000,
      category: 'Desert',
    },
    {
      name: 'Oreo desert',
      description: 'Stakanda qaymoq, shokolad sousi va Oreo pechenyesi.',
      ingredients: ['Qaymoq', 'Shokolad sousi', 'Oreo pechenyesi'],
      imageUrl: img('photo-1563805042-7684c019e1cb'),
      oldPrice: 32000,
      newPrice: 26000,
      category: 'Desert',
    },

    // ---------- ICHIMLIK ----------
    {
      name: 'Sprite 0.5 L',
      description: 'Limon va laym ta’mli tetiklantiruvchi ichimlik.',
      ingredients: [],
      imageUrl: img('photo-1625772299848-391b6a87d7b3'),
      oldPrice: 10000,
      newPrice: 7000,
      category: 'Ichimlik',
    },
    {
      name: 'Uy limonadi',
      description: 'Yangi limon, yalpiz va muz — o‘zimizda tayyorlanadi.',
      ingredients: ['Limon', 'Yalpiz', 'Muz', 'Shakar'],
      imageUrl: img('photo-1621263764928-df1444c5e859'),
      oldPrice: 20000,
      newPrice: 15000,
      category: 'Ichimlik',
    },
    {
      name: 'Muzli choy',
      description: 'Laym bo‘lakchalari bilan sovuq qora choy.',
      ingredients: ['Qora choy', 'Laym', 'Muz'],
      imageUrl: img('photo-1556679343-c7306c1976bc'),
      oldPrice: 18000,
      newPrice: 13000,
      category: 'Ichimlik',
    },
  ];
}

export default SEED_PRODUCTS;
