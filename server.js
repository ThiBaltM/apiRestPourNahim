const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const bcrypt = require("bcrypt");

const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const port = 8000;
const sql = postgres({ db:"bddrest", user:"postgres", password:"epsi"});

app.use(express.json());

//products
const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
})

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

app.get("/products/:id", async (req, res) => {
    const product = await sql`
        SELECT * FROM products WHERE id=${req.params.id}
        `;
    if (product.lenght > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found"});
    }
})

app.delete("/products/:id", async (req, res) => {
    const product = await sql`
        DELETE FROM products
        WHERE id=${req.params.id}
        RETURNING *
        `;
    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found" });
    }
})

app.get("/products", async(req,res)=>{
    var {name, about, price} = req.query;
    if(name == undefined){name = ""};
    if(about == undefined){about=""};
    
    if(price == null){
        product = await sql`SELECT * FROM products WHERE name LIKE ${'%'+name+'%'} AND about LIKE ${'%'+about+'%'}`;

    }else{
        product = await sql`
        SELECT * FROM products WHERE name LIKE ${'%'+name+'%'} AND about LIKE ${'%'+about+'%'} AND price=${price}`;
    }

    if(product.length < 1){
        res.status(404).send({message:"not found"});
    }else{
        res.send(product[0])
    }
});

// user 
const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
});

const UserSchemaPost = UserSchema.omit({ id: true });

app.post("/users", async (req, res) => {
    try {
        const result = UserSchemaPost.parse(req.body);

        const { name, email, password } = result;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await sql`
            INSERT INTO users (name, email, password)
            VALUES (${name}, ${email}, ${hashedPassword})
            RETURNING id, name, email
        `;

        res.status(201).json(newUser[0]);
    } catch (error) {
        res.status(400).json({ message: "Invalid data", error });
    }
});


app.get("/users", async (req, res) => {
    const users = await sql`
        SELECT id, name, email FROM users
    `;
    res.json(users);
});

app.get("/users/:id", async (req, res) => {
    const user = await sql`
        SELECT id, name, email FROM users WHERE id = ${req.params.id}
    `;
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

        const updatedUser = await sql`
            UPDATE users
            SET name = ${name}, email = ${email}, password = ${hashedPassword}
            WHERE id = ${id}
            RETURNING id, name, email
        `;

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

// orders
const OrderSchema = z.object({
    userId: z.number(),
    productId: z.number(),
    payment: z.boolean().optional() 
});

const OrderSchemaPost = OrderSchema.omit({ id: true });

app.post("/orders", async (req, res) => {
    try {
        const result = OrderSchemaPost.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ message: "Invalid data", errors: result.error });
        }

        const { userId, productId } = result.data;

        const product = await sql`
            SELECT price FROM products WHERE id = ${productId}
        `;

        if (product.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        const price = product[0].price;
        const total = price * 1.2;

        let payment = false; 

        if (result.data.payment !== undefined) {
            payment = result.data.payment;
        }

        const newOrder = await sql`
            INSERT INTO orders (user_id, product_id, total, payment, created_at, updated_at)
            VALUES (${userId}, ${productId}, ${total}, ${payment}, NOW(), NOW())
            RETURNING *
        `;

        res.status(201).json(newOrder[0]);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/orders", async (req, res) => {
    try {
        const orders = await sql`
            SELECT orders.*, users.name, users.email, products.*
            FROM orders
            INNER JOIN users ON orders.user_id = users.id
            INNER JOIN products ON orders.product_id = products.id
        `;
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/orders/:id", async (req, res) => {
    try {
        const order = await sql`
            SELECT orders.*, users.name, users.email, products.*
            FROM orders
            INNER JOIN users ON orders.user_id = users.id
            INNER JOIN products ON orders.product_id = products.id
            WHERE orders.id = ${req.params.id}
        `;
        if (order.length > 0) {
            res.json(order[0]);
        } else {
            res.status(404).json({ message: "Order not found" });
        }
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/orders/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { productId, payment } = req.body;

        const existingOrder = await sql`
            SELECT * FROM orders WHERE id = ${orderId}
        `;
        if (existingOrder.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const product = await sql`
            SELECT price FROM products WHERE id = ${productId}
        `;

        if (product.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        const price = product[0].price;
        const total = price * 1.2;

        const updatedOrder = await sql`
            UPDATE orders
            SET product_id = ${productId}, total = ${total}, payment = ${payment}, updated_at = NOW()
            WHERE id = ${orderId}
            RETURNING *
        `;

        res.json(updatedOrder[0]);
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.listen(port, ()=>{
    console.log(`Listening on http://localhost:${port}`);
});