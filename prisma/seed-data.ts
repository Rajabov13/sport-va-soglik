/** Fictional, realistic-looking demo data for Uzbekistan. No real personal data. */

export const CATEGORIES = [
  { slug: "elderly", icon: "HandHeart", color: "#6366f1", nameUz: "Keksalarga yordam", nameRu: "Помощь пожилым", nameEn: "Elderly", relatedSkills: ["caregiving", "shopping", "driving"] },
  { slug: "disability", icon: "Accessibility", color: "#0ea5e9", nameUz: "Imkoniyati cheklanganlar", nameRu: "Поддержка людей с инвалидностью", nameEn: "Disability support", relatedSkills: ["caregiving", "sign-language", "driving"] },
  { slug: "education", icon: "GraduationCap", color: "#8b5cf6", nameUz: "Ta'lim", nameRu: "Образование", nameEn: "Education", relatedSkills: ["tutoring", "math", "english", "it"] },
  { slug: "food", icon: "Utensils", color: "#f59e0b", nameUz: "Oziq-ovqat", nameRu: "Продукты питания", nameEn: "Food", relatedSkills: ["cooking", "driving", "logistics"] },
  { slug: "medicine", icon: "Pill", color: "#ef4444", nameUz: "Dori-darmon", nameRu: "Лекарства", nameEn: "Medicine", relatedSkills: ["driving", "first-aid", "medical"] },
  { slug: "emergency", icon: "Siren", color: "#dc2626", nameUz: "Favqulodda yordam", nameRu: "Экстренная помощь", nameEn: "Emergency support", relatedSkills: ["first-aid", "driving", "logistics"] },
  { slug: "children", icon: "Baby", color: "#ec4899", nameUz: "Bolalar", nameRu: "Дети", nameEn: "Children", relatedSkills: ["tutoring", "childcare", "games"] },
  { slug: "environment", icon: "Leaf", color: "#16a34a", nameUz: "Ekologiya", nameRu: "Экология", nameEn: "Environment", relatedSkills: ["gardening", "cleaning", "logistics"] },
  { slug: "other", icon: "Sparkles", color: "#64748b", nameUz: "Boshqa", nameRu: "Другое", nameEn: "Other", relatedSkills: [] },
];

export const LOCATIONS = [
  { slug: "toshkent", city: "Toshkent", region: "Toshkent shahri", latitude: 41.2995, longitude: 69.2401 },
  { slug: "samarqand", city: "Samarqand", region: "Samarqand viloyati", latitude: 39.6542, longitude: 66.9597 },
  { slug: "buxoro", city: "Buxoro", region: "Buxoro viloyati", latitude: 39.7747, longitude: 64.4286 },
  { slug: "andijon", city: "Andijon", region: "Andijon viloyati", latitude: 40.7821, longitude: 72.3442 },
  { slug: "namangan", city: "Namangan", region: "Namangan viloyati", latitude: 40.9983, longitude: 71.6726 },
  { slug: "fargona", city: "Farg'ona", region: "Farg'ona viloyati", latitude: 40.3864, longitude: 71.7864 },
  { slug: "nukus", city: "Nukus", region: "Qoraqalpog'iston", latitude: 42.4619, longitude: 59.6003 },
  { slug: "qarshi", city: "Qarshi", region: "Qashqadaryo viloyati", latitude: 38.8606, longitude: 65.7891 },
  { slug: "urganch", city: "Urganch", region: "Xorazm viloyati", latitude: 41.55, longitude: 60.6333 },
  { slug: "jizzax", city: "Jizzax", region: "Jizzax viloyati", latitude: 40.1158, longitude: 67.8422 },
  { slug: "navoiy", city: "Navoiy", region: "Navoiy viloyati", latitude: 40.0844, longitude: 65.3792 },
  { slug: "termiz", city: "Termiz", region: "Surxondaryo viloyati", latitude: 37.2242, longitude: 67.2783 },
  { slug: "guliston", city: "Guliston", region: "Sirdaryo viloyati", latitude: 40.4897, longitude: 68.7842 },
  { slug: "chirchiq", city: "Chirchiq", region: "Toshkent viloyati", latitude: 41.4689, longitude: 69.5822 },
];

export const MALE_FIRST = ["Aziz", "Jasur", "Sardor", "Bekzod", "Shahzod", "Otabek", "Rustam", "Javohir", "Akmal", "Sherzod", "Ulug'bek", "Doniyor", "Temur", "Bobur", "Islom", "Farrux", "Kamron", "Behruz", "Asilbek", "Jahongir"];
export const FEMALE_FIRST = ["Dilnoza", "Malika", "Nodira", "Gulnora", "Madina", "Zarina", "Feruza", "Sevara", "Nilufar", "Kamola", "Laylo", "Mohira", "Shahnoza", "Dildora", "Munisa", "Sabina", "Zilola", "Robiya", "Durdona", "Yulduz"];
export const LAST = ["Karimov", "Rahimov", "Tursunov", "Yusupov", "Abdullayev", "Qodirov", "Ergashev", "Nazarov", "Saidov", "Usmonov", "Xolmatov", "Mirzayev", "Sobirov", "Aliyev", "Ismoilov", "Hamidov", "Jo'rayev", "Sultonov"];

export const SKILL_POOL = ["driving", "first-aid", "medical", "caregiving", "shopping", "cooking", "logistics", "tutoring", "math", "english", "it", "childcare", "games", "gardening", "cleaning", "sign-language"];

export const ORGANIZATIONS = [
  { name: "Mehr Ko'prigi", type: "NGO", city: "toshkent", description: "Yolg'iz keksalar va imkoniyati cheklangan insonlarga muntazam g'amxo'rlik ko'rsatuvchi ko'ngillilar tarmog'i.", status: "VERIFIED" },
  { name: "Yashil Qadam", type: "NGO", city: "samarqand", description: "Shaharlarni ko'kalamzorlashtirish, chiqindilarni saralash va ekologik ta'lim bo'yicha jamoat tashabbusi.", status: "VERIFIED" },
  { name: "Bilim Nuri", type: "Education", city: "buxoro", description: "Chekka mahallalardagi bolalar uchun bepul repetitorlik va kutubxona loyihalari.", status: "VERIFIED" },
  { name: "Shifo Qo'li", type: "Health", city: "andijon", description: "Bemorlarga dori yetkazish, shifoxonaga kuzatib borish va donorlik aksiyalari.", status: "VERIFIED" },
  { name: "Oila Tayanchi", type: "Charity", city: "fargona", description: "Kam ta'minlangan oilalarga oziq-ovqat savatlari va kiyim-kechak tarqatish.", status: "VERIFIED" },
  { name: "Nukus Ko'ngillilari", type: "Community", city: "nukus", description: "Qoraqalpog'istonda favqulodda vaziyatlarda tezkor yordam ko'rsatuvchi jamoa.", status: "PENDING" },
];

export const CAMPAIGNS = [
  { org: 0, title: "Qishki mehr: keksalarga issiq kiyim", category: "elderly", city: "toshkent", description: "Qish oylarida yolg'iz yashovchi keksalarga issiq kiyim, ko'mir va oziq-ovqat yetkazib beramiz. Har bir ko'ngilli haftasiga 2 soat vaqt ajratadi.", goalHelps: 120, goalVolunteers: 40, startOffset: -40, endOffset: 50 },
  { org: 1, title: "10 000 daraxt — Samarqand uchun", category: "environment", city: "samarqand", description: "Bahorgi ko'chat ekish aksiyasi: mahallalar, maktablar va bog'larda 10 000 ta daraxt ekamiz va ularni parvarishlaymiz.", goalHelps: 80, goalVolunteers: 120, startOffset: -20, endOffset: 70 },
  { org: 2, title: "Har bir bolaga kitob", category: "education", city: "buxoro", description: "Qishloq maktablari kutubxonalarini to'ldirish va haftalik bepul mashg'ulotlar tashkil etish.", goalHelps: 60, goalVolunteers: 25, startOffset: -60, endOffset: 30 },
  { org: 3, title: "Dori yetkazib berish xizmati", category: "medicine", city: "andijon", description: "Uydan chiqa olmaydigan bemorlarga dorixonadan dori olib kelish bo'yicha doimiy ko'ngillilar xizmati.", goalHelps: 200, goalVolunteers: 30, startOffset: -80, endOffset: 100 },
  { org: 4, title: "Ramazon savatlari", category: "food", city: "fargona", description: "Kam ta'minlangan oilalarga oziq-ovqat savatlarini yig'ish va manzilga yetkazish.", goalHelps: 300, goalVolunteers: 60, startOffset: -100, endOffset: -10 },
  { org: 0, title: "Aravachali qo'shnilarimiz", category: "disability", city: "toshkent", description: "Imkoniyati cheklangan insonlarni shifoxona, bank va davlat xizmatlariga kuzatib borish.", goalHelps: 90, goalVolunteers: 20, startOffset: -15, endOffset: 75 },
];

export const REQUEST_TEMPLATES = [
  { category: "medicine", urgency: "HIGH", title: "Keksa onaxonga dori olib kelish kerak", description: "78 yoshli onaxon yurish qiyin, shifokor yozib bergan dorilarni yaqin dorixonadan olib kelib berish kerak. Retsept tayyor, pul beriladi.", people: 1, hours: 1 },
  { category: "elderly", urgency: "MEDIUM", title: "Bozordan oziq-ovqat xarid qilib berish", description: "Yolg'iz yashovchi bobo uchun haftalik oziq-ovqat (non, sabzavot, yog') xarid qilib, uyiga olib chiqib berish kerak. 3-qavat, lift yo'q.", people: 1, hours: 2 },
  { category: "education", urgency: "LOW", title: "5-sinf o'quvchisiga matematikadan yordam", description: "Ota-onasi ishlaydigan bola uchun haftada ikki marta matematika va ingliz tilidan uy vazifalarini tushuntirib beradigan ko'ngilli kerak.", people: 1, hours: 2 },
  { category: "food", urgency: "HIGH", title: "Ko'p bolali oilaga oziq-ovqat savati", description: "Otasi kasal bo'lib ishlay olmayotgan 5 bolali oilaga bir haftalik oziq-ovqat savati kerak. Mahalla raisi tasdiqlagan.", people: 7, hours: 2 },
  { category: "disability", urgency: "MEDIUM", title: "Aravachadagi yigitni poliklinikaga kuzatish", description: "Aravachada harakatlanadigan yigitni ertalab 9:00 da poliklinikaga olib borib, qaytarib kelish kerak. Mashinasi bor ko'ngilli ma'qul.", people: 1, hours: 3 },
  { category: "emergency", urgency: "CRITICAL", title: "Yong'indan zarar ko'rgan oilaga yordam", description: "Kecha uyda yong'in chiqib, oila kiyim-kechak va ro'zg'or buyumlarisiz qoldi. Vaqtincha zarur narsalar va yuk tashishda yordam kerak.", people: 4, hours: 5 },
  { category: "children", urgency: "LOW", title: "Mehribonlik uyi bolalari uchun o'yin kuni", description: "Shanba kuni mehribonlik uyi bolalari uchun sport va intellektual o'yinlar tashkil qilishda yordam beradigan 3-4 ko'ngilli kerak.", people: 25, hours: 4 },
  { category: "environment", urgency: "LOW", title: "Mahalla bog'ini tozalash shanbaligi", description: "Mahalladagi bolalar bog'chasi yonidagi maydonni chiqindilardan tozalash va gul ko'chatlari ekish uchun ko'ngillilar kerak.", people: 60, hours: 3 },
  { category: "medicine", urgency: "CRITICAL", title: "Insulin zudlik bilan kerak", description: "Qandli diabet bilan og'rigan bemorning insulini tugab qoldi, yaqin atrofdagi navbatchi dorixonadan olib kelish zarur. Bugun kechqurungacha.", people: 1, hours: 1 },
  { category: "elderly", urgency: "MEDIUM", title: "Nuroniyning uyida kichik ta'mir", description: "Yolg'iz yashovchi nuroniy onaxonning oshxonasidagi jo'mrak oqyapti va eshik qulfi buzilgan. Qo'li gul ko'ngilli kerak.", people: 1, hours: 2 },
  { category: "education", urgency: "MEDIUM", title: "Kompyuter savodxonligi bo'yicha dars", description: "Pensiyadagi o'qituvchiga smartfon va davlat xizmatlari portalidan foydalanishni o'rgatish kerak. 2-3 ta qisqa mashg'ulot.", people: 1, hours: 3 },
  { category: "food", urgency: "MEDIUM", title: "Iftorlik uchun ovqat tarqatish", description: "Kechqurun masjid yonida yolg'iz keksalarga issiq ovqat tarqatishda yordam beradigan ko'ngillilar kerak.", people: 40, hours: 3 },
  { category: "disability", urgency: "LOW", title: "Ko'zi ojiz talabaga kitob o'qib berish", description: "Ko'zi ojiz talaba uchun darsliklarni ovozli yozib berish yoki haftada bir marta o'qib berish kerak.", people: 1, hours: 2 },
  { category: "children", urgency: "MEDIUM", title: "Maktab formasi va kanselyariya yig'ish", description: "Yangi o'quv yiliga 10 nafar kam ta'minlangan oila bolalari uchun maktab formasi va kanselyariya to'plamlarini yig'ish.", people: 10, hours: 4 },
  { category: "emergency", urgency: "HIGH", title: "Suv bosgan yerto'ladan buyumlarni olib chiqish", description: "Kuchli yomg'irdan keyin yerto'lani suv bosdi. Keksa er-xotinga buyumlarni olib chiqish va quritishda yordam kerak.", people: 2, hours: 4 },
  { category: "medicine", urgency: "MEDIUM", title: "Shifoxonaga kuzatib borish", description: "Ko'rish qobiliyati past onaxonni payshanba kuni ko'z shifoxonasiga olib borib, navbatda turib, uyga qaytarish kerak.", people: 1, hours: 4 },
  { category: "environment", urgency: "MEDIUM", title: "Plastik idishlarni saralash aksiyasi", description: "Maktab o'quvchilari bilan birga plastik va qog'oz chiqindilarni saralab, qayta ishlash punktiga topshirish.", people: 30, hours: 3 },
  { category: "elderly", urgency: "HIGH", title: "Kommunal to'lovlarni amalga oshirishda yordam", description: "Nuroniy bobo gaz va elektr to'lovlarini qanday qilishni bilmaydi, qarzdorlik yig'ilib qolgan. Hujjatlar bilan yordam kerak.", people: 1, hours: 2 },
  { category: "other", urgency: "LOW", title: "Mahalla kutubxonasini tartibga solish", description: "Mahalla markazidagi 2000 dan ortiq kitobni katalog qilish va javonlarga joylashtirishda yordam kerak.", people: 100, hours: 5 },
  { category: "food", urgency: "CRITICAL", title: "Oilada ovqat butunlay tugagan", description: "Yaqinda ishdan bo'shagan ona va 3 farzandi uchun zudlik bilan oziq-ovqat kerak. Ijtimoiy xodim xabardor.", people: 4, hours: 1 },
];

export const REVIEW_COMMENTS = [
  "Juda mas'uliyatli va samimiy inson. Katta rahmat!",
  "O'z vaqtida keldi, hammasini a'lo darajada bajardi.",
  "Onamiz juda xursand bo'ldilar. Alloh rozi bo'lsin!",
  "Tez javob berdi va yordamini ayamadi.",
  "Hammasi yaxshi o'tdi, yana murojaat qilaman.",
  "Ajoyib ko'ngilli, odob-axloqi bilan namuna.",
];

export const CHAT_LINES = [
  ["Assalomu alaykum! Arizangizni ko'rdim, yordam berishga tayyorman.", "Va alaykum assalom! Rahmat sizga, qachon kela olasiz?"],
  ["Bugun soat 17:00 da kelsam bo'ladimi?", "Ha, juda yaxshi. Manzil aniq ko'rsatilgan."],
  ["Dorixonaga yetib keldim, retseptni rasmini yuborolasizmi?", "Hozir yuboraman, rahmat!"],
  ["Hammasi tayyor, 10 daqiqada yetib boraman.", "Kutib turibmiz 🙏"],
];
