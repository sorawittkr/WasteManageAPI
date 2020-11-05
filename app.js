const express = require('express')
const bcrypt = require('bcryptjs')

const mongodb = require('mongodb')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const mongoUrl = 'mongodb+srv://wasteadmin:0801069182@wastemanagement.paaew.mongodb.net/<dbname>?retryWrites=true&w=majority'
const DB_Name = 'WasteManagementDB'

const app = express()
const port = 3000
app.use(express.json());

//เรียกใช้  Cross Origin Resource Sharing (CORS) ให้สามารถเรียกข้ามโดเมนได้
//allow client to access cross domain or ip-address 
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );
    next();
});

//สมัครสมาชิก
app.post('/register', async(req, res) => {
    let username = req.body.username
    let password = req.body.password
    let encryPwd = await bcrypt.hash(password, 8) //เข้ารหัสโดยการ bcrypt.hash 
    let prefix = req.body.prefix
    let firstname = req.body.firstname
    let lastname = req.body.lastname
    let email = req.body.email
    let phone = req.body.phone
    let status = req.body.status


    let userData = {
        username: username,
        password: encryPwd,
        prefix: prefix,
        firstname: firstname,
        lastname: lastname,
        email: email,
        phone: phone,
        status: status
    }

    let client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }).catch((err) => {
        console.log(err)
        res.status(500).json({ error: err })
    })

    try {
        let db = client.db(DB_Name)
        let result = await db.collection('Users').insertOne(userData) //insert User Data to Database
        binManageData = {
            bins: [],
            user_id: result.insertedId
        }
        let binManageStore = await db.collection('Bins_manage').insertOne(binManageData) //insert Bin mange Data
        res.status(201).send({ id: result.insertedId }) //ส่ง ObjectID User ไปด้วยหลังจากที่ข้อมูลถูก insert แล้ว 
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err })
    } finally {
        client.close()
    }

})

//user login (เข้าสู่ระบบ)
app.post('/login', async(req, res) => {
    let username = req.body.username
    let password = req.body.password

    let client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }).catch((err) => {
        console.log(err)
        res.status(500).json({ error: err })
    })

    try {
        let db = client.db(DB_Name)
        let user = await db.collection('Users').findOne({ username: username }) //ดึงข้อมูล users

        if (!user) { //กรณีไม่มี ผู้ใช้นั้น
            res.status(401).json({ error: `ชื่อผู้ใช้: ${username} ไม่มีอยู๋ในระบบ` })
            return
        }

        let valid = await bcrypt.compare(password, user.password) //ใช้  bcrypt.compare ในการเทียบรหัสที่ส่งมา กับรหัสที่ถูกเข้ารหัสอยู่ใน Database 
        if (!valid) {
            res.status(401).json({ error: 'ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง' })
            return
        }

        delete user.password //ลบ password ก่อนจะส่งค่าไปให้คนที่เรียกใช้
        res.json({ data: user })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err })
    } finally {
        client.close()
    }

})

//เพิ่มถังขยะ Add Bin
app.post('/addBin', async(req, res) => {
    let bin_code = req.body.bin_code
    let user_id = req.body.user_id

    let client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }).catch((err) => {
        console.log(err)
        res.status(500).json({ error: err })
    })

    try {
        let db = client.db(DB_Name)
        let bin = await db.collection('Bins').findOne({ bin_code: bin_code }) //ดึงข้อมูล ถังขยะ

        if (!bin) { //กรณีไม่มีรหัสถังขยะนี้อยู่
            res.status(401).json({ error: `ไม่พบรหัสถังขยะ: ${bin_code} อยู๋ในระบบ` })
            return
        }

        if (bin.online_status == false) {
            res.status(401).json({ error: 'ถังขยะไม่พร้อมใช้งาน กรุณาเปิดเครื่องถังขยะก่อนใช้งาน' })
            return
        }

        delete bin.bin_code //ลบ bin_code ก่อนจะส่งค่าไปให้คนที่เรียกใช้

        let result = await db.collection('Bins_manage').update({ user_id: ObjectID(user_id) }, { $push: { bins: { bin_id: bin._id } } })
        res.sendStatus(200)


    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err })
    } finally {
        client.close()
    }

})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
})