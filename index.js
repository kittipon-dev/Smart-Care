const firebase = require("firebase-admin");
//const express = require("express");
const { nanoid } = require("nanoid");
const moment = require("moment");

const serviceAccount = require("./serviceAccountKey.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

const db = firebase.firestore();

// const app = express();
// app.use(express.json());

// app.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   await db.collection("history").doc(id).update({
//     eated: true,
//   });
//   res.send("ok");
// });

async function createHistory() {
  try {
    const time = new Date();
    //time end day 23.59.59
    // const timeEnd = new Date(
    //   time.getFullYear(),
    //   time.getMonth(),
    //   time.getDate(),
    //   23,
    //   59,
    //   59
    // );

    //console.log(timeEnd, new Date());
    const listOpen = await db
      .collection("medicines")
      .where("endDateTimestamp", ">=", time)
      .where("history", "==", false)
      .get();

    //get time current hour and minute

    const hour = time.getHours();
    const minute = time.getMinutes();
    //reset history
    if (hour === 0 && minute === 0) {
      const listHistory = await db
        .collection("medicines")
        .where("history", "==", true)
        .get();
      listHistory.forEach(async (doc) => {
        await db.collection("medicines").doc(doc.id).update({
          history: false,
        });
      });
    }

    if (listOpen.empty) {
      return;
    }

    //data
    const data = listOpen.docs.map((doc) => doc.data());

    //status medicine eated
    for (let i = 0; i < data.length; i++) {
      const v = data[i];

      //to string 2 digit
      const hourString = hour.toString().padStart(2, "0");
      const minuteString = minute.toString().padStart(2, "0");
      const timeCurrent = hourString + ":" + minuteString;

      if (v.time === timeCurrent) {
        //create history medicine
        const id = nanoid();
        await db
          .collection("history")
          .doc(id)
          .set({
            uid: v.uid,
            name: v.name,
            date: new Date(),
            dateText: moment(new Date()).format("DD/MM/YY"),
            type: v.type,
            amount: v.amount,
            eated: false,
            id: id,
          });

        //update status medicine eated
        const docId = listOpen.docs[i].id;
        await db.collection("medicines").doc(docId).update({
          history: true,
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}

setInterval(async () => {
  createHistory();
}, 10000);

// app.listen(3000, () => {
//   console.log("Listening on port 3000");
// });