const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const usersCollection = db.collection('users');

// POST: 유저 추가
exports.createUser = onRequest((req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
  
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).send({ error: 'Missing name or email' });
    }

    const hangulRegex = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
    if (hangulRegex.test(name)) {
        return res.status(400).send({ error: 'Name must not contain Korean characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send({ error: 'Invalid email format. e.g., example@domain.com' });
    }
  
    usersCollection
      .add({ name, email,createdAt: admin.firestore.FieldValue.serverTimestamp() })
      .then((newUserRef) => {
        res.status(201).send({ id: newUserRef.id, message: 'User created' });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send({ error: error.message });
      });
  });


  exports.getUser = onRequest((req,res)=>{
    if(req.method!=='GET'){
        return res.status(405).send('Method Not Allowed');
    }

    const userName = req.query.name;
    if(!userName){
        return res.status(400).send({error:'Missing user name in query'});
    }

    usersCollection
        .where('name','==',userName)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            if(querySnapshot.empty){
                return res.status(404).send({message:'User not found'});
            }

            const userDoc = querySnapshot.docs[0];
            res.status(200).send({id:userDoc.id, ...userDoc.data()});
        })
        .catch((error)=>{
            console.error(error);
            res.status(500).send({error:error.message});
        });
})

exports.updateUser = onRequest((req,res)=>{
    if(req.method!=='PUT'){
        return res.status(405).send('Method Not Allowed');
    }

    const userName = req.query.name;
    const  updateFields = req.body;

    if(!userName || !updateFields){
        return res.status(400).send({error:'Missing user name in query or update data'});
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updateFields.email)) {
        return res.status(400).send({ error: 'Invalid email format. e.g., example@domain.com' });
    }

    usersCollection
        .where('name','==',userName)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            if(querySnapshot.empty){
                return res.status(404).send({message:'User not found'});
            }

            const userDoc = querySnapshot.docs[0];
            return userDoc.ref.update(updateFields);
        })
        .then(()=>{
            res.status(200).send({message:'User updated successfully'});
        })
        .catch((error)=>{
            console.error(error);
            res.status(500).send({error:error.message});
        });
})

// DELETE: 유저 삭제
exports.deleteUser = onRequest((req, res) => {
    if (req.method !== 'DELETE') {
      return res.status(405).send('Method Not Allowed');
    }
  
    const userName = req.query.name;
    if (!userName) {
      return res.status(400).send({ error: 'Missing user name in query' });
    }
  
    usersCollection
      .where('name', '==', userName)
      .limit(1)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          return res.status(404).send({ message: 'User not found' });
        }
  
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        const createdAt = data.createdAt;
        if (createdAt && (Date.now() - createdAt.toDate().getTime() < 60 * 1000)) {
            return res
              .status(400)
              .send({ error: '가입 후 1분이 지나야 삭제할 수 있습니다.' });
        }
        return userDoc.ref.delete();
      })
      .then(() => {
        res.status(200).send({ message: 'User deleted successfully' });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send({ error: error.message });
      });
  });
  