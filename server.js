const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const SECRET = "ecommerce_secret_key";

/* 🔗 DB */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Ha12@#₹_",
  database: "ecommerce"
});

db.connect(err => {
  if (err) console.log(err);
  else console.log("✅ MySQL Connected");
});

/* 🔐 VERIFY TOKEN */
function verifyToken(req,res,next){

  const bearer = req.headers.authorization;
  if(!bearer) return res.status(403).send("Token required");

  const token = bearer.split(" ")[1];

  jwt.verify(token,SECRET,(err,decoded)=>{
    if(err) return res.status(401).send("Invalid token");
    req.user = decoded;
    next();
  });

}

/* 👑 VERIFY ADMIN */
function verifyAdmin(req,res,next){

  if(req.user.role !== "admin")
    return res.status(403).send("Admin only");

  next();
}

/* 👤 REGISTER */
app.post("/register",(req,res)=>{

  const {email,password} = req.body;

  db.query(
    "INSERT INTO users (email,password) VALUES (?,?)",
    [email,password],
    err=>{
      if(err) return res.send("User exists");
      res.send("Registered");
    }
  );

});

/* 🔐 LOGIN */
app.post("/login",(req,res)=>{

  const {email,password} = req.body;

  db.query(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email,password],
    (err,result)=>{

      if(result.length === 0)
        return res.status(401).send("Invalid");

      const user = result[0];

      const token = jwt.sign(
        {email:user.email, role:user.role},
        SECRET,
        {expiresIn:"1d"}
      );

      res.json({token});
    }
  );

});

/* 📦 GET PRODUCTS */
app.get("/products",(req,res)=>{
  db.query("SELECT * FROM products",(err,result)=>{
    res.send(result);
  });
});

/* 🛒 ADD TO CART */
app.post("/add-to-cart",verifyToken,(req,res)=>{

  const {product_id} = req.body;

  const sql = `
  INSERT INTO cart (user_email,product_id,quantity)
  VALUES (?, ?, 1)
  ON DUPLICATE KEY UPDATE quantity = quantity + 1
  `;

  db.query(sql,[req.user.email,product_id],
  ()=>res.send("Added to cart"));

});

/* 🛒 GET CART */
app.get("/cart",verifyToken,(req,res)=>{

  const sql = `
  SELECT products.*, cart.quantity
  FROM cart
  JOIN products ON cart.product_id = products.id
  WHERE cart.user_email=?
  `;

  db.query(sql,[req.user.email],
  (err,result)=>res.send(result));

});

/* ➕➖ UPDATE QTY */
app.post("/update-quantity",verifyToken,(req,res)=>{

  const {product_id,change} = req.body;

  db.query(`
  UPDATE cart SET quantity = quantity + ?
  WHERE product_id=? AND user_email=?`,
  [change,product_id,req.user.email],
  ()=>res.send("updated"));

});

/* ❌ REMOVE FROM CART */
app.post("/remove-from-cart",verifyToken,(req,res)=>{

  const {product_id} = req.body;

  db.query(
    "DELETE FROM cart WHERE product_id=? AND user_email=?",
    [product_id,req.user.email],
    ()=>res.send("removed")
  );

});

/* ⭐ ADD REVIEW */
app.post("/add-review",verifyToken,(req,res)=>{

  const {product_id,rating,comment} = req.body;

  db.query(
    "INSERT INTO reviews SET ?",
    {
      product_id,
      user_email:req.user.email,
      rating,
      comment
    },
    ()=>res.send("Review added")
  );

});

/* ⭐ RATINGS */
app.get("/ratings",(req,res)=>{

  db.query(`
    SELECT product_id, AVG(rating) as avgRating
    FROM reviews
    GROUP BY product_id
  `,(err,result)=>{

    if(err){
      console.log(err);
      return res.json([]);   // 🔥 IMPORTANT
    }

    res.json(result || []);  // 🔥 ALWAYS RETURN JSON

  });

});

/* 📩 CONTACT */
app.post("/contact",verifyToken,(req,res)=>{

  const {message} = req.body;

  db.query(
    "INSERT INTO contact SET ?",
    {email:req.user.email,message},
    ()=>res.send("Message sent")
  );

});

/* 👑 ADMIN — ADD PRODUCT */
app.post("/admin/add-product",verifyToken,verifyAdmin,(req,res)=>{

  db.query("INSERT INTO products SET ?",req.body,
  ()=>res.send("Product added"));

});

/* 👑 ADMIN — DELETE PRODUCT */
app.delete("/admin/delete-product/:id",verifyToken,verifyAdmin,(req,res)=>{

  db.query("DELETE FROM products WHERE id=?",
  [req.params.id],
  ()=>res.send("Deleted"));

});

/* 👑 ADMIN — UPDATE STOCK */
app.put("/admin/update-stock",verifyToken,verifyAdmin,(req,res)=>{

  const {id,stock} = req.body;

  db.query(
    "UPDATE products SET stock=? WHERE id=?",
    [stock,id],
    ()=>res.send("Stock updated")
  );

});

app.listen(5000,()=>console.log("🔥 Server running"));