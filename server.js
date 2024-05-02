const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const bcrypt = require("bcrypt");

const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const port = 8000;
const sql = postgres({ db:"bddrest", user:"postgres", password:"epsiepsi"});

app.use(express.json());

//Schemas
const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
})

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    password: z.string(),
    email:z.string()
})

const UserSchemaPost = UserSchema.omit({id:true});

const ProductSchemaPost = ProductSchema.omit({id:true});

app.post("/products", async (req, res)=> {
    const result = await ProductSchemaPost.safeParse(req.body);
    if(result.success){
        const {name, about, price} =result.data;

        const product = await sql`
        INSERT INTO products (name, about, price)
        VALUES (${name}, ${about}, ${price})
        RETURNING *`;

        res.send(product[0]);
    }else{
        res.status(400).send(result);
    }
});

app.get("/", (req,res) => {
    res.send("Hello World!");
});

app.listen(port, ()=>{
    console.log(`Listening on http://localhost:${port}`);
});

app.get("/products/:id", async(req,res)=>{
    const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}`;

    if(product.length<1){
        res.status(404).send({message:"not found"});
    }else{
        res.send(product[0])
    }
});

app.delete("/products/:id", async (req, res) => {
    const product = await sql
        `DELETE FROM products
        WHERE id=${req.params.id}
        RETURNING *`
        ;
    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found" });
    }
})

app.post("/users", async (req, res) => {
    try {
        const result = UserSchemaPost.parse(req.body);

        const { name, email, password } = result;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await sql
            `INSERT INTO users (name, email, password)
            VALUES (${name}, ${email}, ${hashedPassword})
            RETURNING id, name, email`
        ;

        res.status(201).json(newUser[0]);
    } catch (error) {
        res.status(400).json({ message: "Invalid data", error });
    }
});

app.get("/users", async (req, res) => {
    const users = await sql
        `SELECT id, name, email FROM users`
    ;
    res.json(users);
});

app.get("/users/:id", async (req, res) => {
    const user = await sql
        `SELECT id, name, email FROM users WHERE id = ${req.params.id}`
    ;
    if (user.length > 0) {
        res.json(user[0]);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

app.put("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await sql
            `UPDATE users
            SET name = ${name}, email = ${email}, password = ${hashedPassword}
            WHERE id = ${id}
            RETURNING id, name, email`
        ;

        if (updatedUser.length > 0) {
            res.json(updatedUser[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/users/:id", async (req,res)=>{
    try {
        empty = true;
        const { id } = req.params;
        const { name, email, password } = req.body;

        if(name != null && name != ""){
            empty = false;
            updatedUser = await sql
            `UPDATE users
            SET name = ${name}
            WHERE id = ${id}
            RETURNING id, name, email`
        }
        if(email != null && email != ""){
            empty = false;
            updatedUser = await sql
            `UPDATE users
            SET email = ${email}
            WHERE id = ${id}
            RETURNING id, name, email`
        }
        if(password != null && password != ""){
            empty=false;
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedUser = await sql
            `UPDATE users
            SET email = ${hashedPassword}
            WHERE id = ${id}
            RETURNING id, name, email`
        }

        if (!empty && updatedUser.length > 0) {
            res.json(updatedUser[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/products", async(req,res)=>{
    var name = req.query.name;
    about = req.query.about;
    price = req.query.price;
    console.log(name)
    console.log(about)
    console.log(price)
    console.log(`SELECT * FROM products WHERE name LIKE '%${name}%' AND about LIKE '%${about}%'`)
    if(price == null){
        product = await sql`
        SELECT * FROM products WHERE name LIKE '%${name}%' AND about LIKE '%${about}%'`;
    }else{
        product = await sql`
        SELECT * FROM products WHERE name LIKE '%${name}%' AND about LIKE '%${about}%' AND price=${price}`;
    }

    

    if(product.length<1){
        res.status(404).send({message:"not found"});
    }else{
        res.send(product[0])
    }
});