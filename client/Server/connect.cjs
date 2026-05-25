
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, 'config.env') });
async function main() {
    const Db = process.env.ATLAS_URI || "mongodb+srv://2201884_db_user:ciSMGiYTbhW13NkR@cluster0.wjuhsil.mongodb.net/?appName=Cluster0";
    const client = new MongoClient(Db, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

    try {
        await client.connect()

    const data = await client.db("Bill").collection("Tracker_Students");
    const collections = await client.db("Bill").collections();
    collections.forEach((collection) => console.log(collection.s.namespace.collection))
    console.log("Connected to MongoDB Atlas")
    const doc = {Name: "John Doe", 'Student ID': 220000, 'Year level': 4}
    const result = await data.insertOne(doc);

    //const query = {Name: "John Doe"};
    //const result = await data.deleteOne(query);
    console.log(`Document inserted with _id: ${result.insertedId}`);
    } catch (e) {
        console.error(e)
    } finally {
        await client.close()
    }
    
}

main()