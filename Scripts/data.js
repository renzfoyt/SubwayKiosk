const PRODUCTS = [
  // Sandwiches
  { id: "S01", name: "BLT",                 category: "Sandwich",  price: 120, image: "images/sandwich/s-blt.png",            stock: 20 },
  { id: "S02", name: "Chicken Teriyaki",    category: "Sandwich",  price: 135, image: "images/sandwich/s-teriyaki(1).png",    stock: 20 },
  { id: "S03", name: "Ham",                 category: "Sandwich",  price: 150, image: "images/sandwich/s-ham.png",            stock: 20 },
  { id: "S04", name: "Italian B.M.T.",      category: "Sandwich",  price: 165, image: "images/sandwich/s-italian.png",        stock: 20 },
  { id: "S05", name: "Roast Beef",          category: "Sandwich",  price: 200, image: "images/sandwich/s-roast.png",          stock: 20 },
  { id: "S06", name: "Spicy Italian",       category: "Sandwich",  price: 125, image: "images/sandwich/s-spicyitalian.png",   stock: 20 },
  { id: "S07", name: "Steak & Cheese",      category: "Sandwich",  price: 130, image: "images/sandwich/s-steakncheese.png",   stock: 1 },
  // Flatbreads
  { id: "F01", name: "Bacon, Egg & Cheese",   category: "Flatbread", price: 75, image: "images/flatbread/b-baconeggflat.png",    stock: 15 },
  { id: "F02", name: "Ham, Egg & Cheese",     category: "Flatbread", price: 55, image: "images/flatbread/b-chickenhamflat.png",  stock: 15 },
  { id: "F03", name: "Sausage, Egg & Cheese", category: "Flatbread", price: 45, image: "images/flatbread/b-sausageeggflat.png",  stock: 15 },
  // Drinks
  { id: "D01", name: "Coca-Cola",    category: "Drinks", price: 75, image: "images/drinks/coke.png", stock: 30 },
  { id: "D02", name: "Dr. Pepper",   category: "Drinks", price: 75, image: "images/drinks/coke.png", stock: 30 },
  { id: "D03", name: "Mug Rootbeer", category: "Drinks", price: 75, image: "images/drinks/coke.png", stock: 30 },
  { id: "D04", name: "Iced Tea",     category: "Drinks", price: 70, image: "images/drinks/coke.png", stock: 30 },
  // Salad Bowls
  { id: "SB01", name: "Rotisserie Bowl",  category: "Salads", price: 195, image: "images/salads/s-rotisseriesalad.jpg", stock: 10 },
  { id: "SB02", name: "Spicy Taco Bowl",  category: "Salads", price: 175, image: "images/salads/s-spicytaco.jpg",       stock: 2 },
  { id: "SB03", name: "Falafel Bowl",      category: "Salads", price: 185, image: "images/salads/s-falafel.jpg", stock: 10 },
  //Wraps
  { id: "W01", name: "Chicken Strip Wrap", category: "Wraps", price: 150, image: "images/wraps/Chickenstrip.png", stock: 15 },
  { id: "W02", name: "Taco Beef Wrap", category: "Wraps", price: 160, image: "images/wraps/Tacobeef.png", stock: 15 },
  { id: "W03", name: "Falafel Wrap", category: "Wraps", price: 140, image: "images/wraps/Falafelwrap.png", stock: 15 },
  { id: "W04", name: "B.L.T. Wrap", category: "Wraps", price: 155, image: "images/wraps/BLTWrap.png", stock: 15 },
  //sides
  { id: "I01", name: "Chips", category: "Sides", price: 35, image: "images/sides/chips.png", stock: 30 },
  { id: "I02", name: "Hash Browns", category: "Sides", price: 55, image: "images/sides/hash.png", stock: 30 },
  { id: "I03", name: "Falafel", category: "Sides", price: 60, image: "images/sides/falafelside.png", stock: 30 },
  { id: "I04", name: "Chocolate Chip", category: "Sides", price: 75, image: "images/sides/chocochip.png", stock: 30 },
  { id: "I05", name: "Double Chocolate", category: "Sides", price: 75, image: "images/sides/doublechoc.png", stock: 30 },
  { id: "I06", name: "Macadamia Nut", category: "Sides", price: 75, image: "images/sides/macadamia.png", stock: 30 },
  { id: "I07", name: "Oatmeal Rasin", category: "Sides", price: 75, image: "images/sides/oatmeal.png", stock: 30 },


];

const CATEGORY_ICONS = {
  Sandwich:  "🥪",
  Flatbread: "🫓",
  Drinks:    "🥤",
  Salads:    "🥗",
  Wraps:     "🌯"
};