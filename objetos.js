const fs = require('fs');
const mongoose = require('mongoose');
const products = require('./models/modeloProductos.js');


let admin = require("firebase-admin");

let serviceAccount = require("./clave.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://firestormdb-7202f.firebaseio.com/',
});

const db = admin.firestore();


class Carrito{
    constructor() {
        this.getLastId();
    }
    async getLastId(){
        console.log('Obteniendo ultima id del carrito...');
        const query = db.collection("carritos").orderBy("id", "desc").limit(1);
        const carrito = (await query.get());
        this.actualId = (carrito.docs[0].data().id) +1;
        console.log('Id obtenida: '+this.actualId);
    }
    async createCart(){
        const newCart = {id: this.actualId};
        newCart.timestamp = Date.now();
        this.actualId++;
        const query = db.collection('carritos');
        const nuevoCarrito = query.doc(String(newCart.id));
        await nuevoCarrito.create(newCart);
        return newCart.id;
    }
    async addToCart(id, productID){
        const product = await products.findOne({id: productID});
        if(product == null){throw{Error: 'Producto no encontrado'}};

        const FinalProduct = {
            id: product.id,
            precio: product.precio,
            imagen: product.imagen,
            descripcion: product.descripcion,
            codigo: product.codigo,
            stock: product.stock,
            timestamp: product.timestamp,
        }
        try{
            const carrito = db.collection(`carritos`).doc(String(id));
            const carritoGet = await carrito.get();
            if(!carritoGet.exists) throw {Error: "El carrito no existe"};

            const query = db.collection(`carritos/${String(id)}/productos`);
            const addProduct = query.doc(String(productID));
            await addProduct.create(FinalProduct);
        }
        catch(e){
            if(e.code == 6){
                throw({Error: 'El producto ya se encuentra en el carrito'});
            }
            else{
                throw(e);
            }
        }

    }
    async viewCart(id){
        const carrito = db.collection(`carritos`).doc(String(id));
        const carritoGet = await carrito.get();
        if(carritoGet.exists){
            let productos = [];
            const query = await db.collection(`carritos/${String(id)}/productos`).get();
            const resultados = (query.docs);
            resultados.map((resultado) => {productos.push(resultado.data())});
            return(productos);
        }
        else{
            throw({Error: "El carrito no existe."});
        }
    }
    async deleteCart(id){
        const carrito = await db.collection(`carritos`).doc(String(id));
        const carritoGet = await carrito.get();
        if(carritoGet.exists){
            await carrito.delete();
        }
        else{
            throw({Error: "El carrito no existe."});
        }
    }
    async deleteFromCart(id, prodID){
        const carrito = await db.collection(`carritos`).doc(String(id));
        const carritoGet = await carrito.get();
        if(carritoGet.exists){
            const producto = await db.collection(`carritos/${String(id)}/productos`).doc(String(prodID));
            const productoGet = await producto.get();
            if(productoGet.exists){
                await producto.delete();
            }
            else{
                throw({Error: "El producto no se encuentra en el carrito."});
            }
        }
        else{
            throw({Error: "El carrito no existe."});
        }

    }
}


class Productos{
    constructor(){
        this.getLatestID();
    }

    async getLatestID() {
         const last_product = await products.findOne({}, {}, { sort: { 'id' : -1 } });
         this.actualId = last_product.id;
    }


    async getAll(){
        const cosa = await products.find({});
        return cosa;
    }
    async getById(id){
        const result = await products.findOne({id: id});
        console.log(result);
        return result;
    }
    async addProduct(product){
        this.actualId++;
        product.timestamp = Date.now();
        product.id = this.actualId;
        const productoSaveModel = new products(product);
        await productoSaveModel.save();
        console.log(productoSaveModel);
    }

    async modifyProduct(id, modification){
        const query = {id: id}
        const update = {
            nombre: modification.nombre,
            precio:modification.precio,
            imagen: modification.imagen,
            descripcion: modification.descripcion,
            codigo: modification.codigo,
            stock: modification.stock,
        }
        const result = await products.findOneAndUpdate(query, update);
        if (result == null) throw {Error: "Producto no encontrado."};
    }

    async deleteProduct(id){
        try{
            await products.findOneAndDelete({id: id});
        }
        catch(e){
            throw(e);
        }
    }

}


async function CRUD() {
    console.log('iniciando');
    try{
        await mongoose.connect('mongodb://localhost:27017/ecommerce', {
            useNewUrlParser: true
        });
    }
    catch(err){
        console.log(err);
    }

}

CRUD();

module.exports = {carrito: Carrito, productos: Productos};