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
  //console.log("createHistory");
  try {
    //const time = new Date();
    //set timezone
    const time = moment(new Date())
      .utcOffset("+07:00")
      .format("YYYY-MM-DD HH:mm:ss");

    const timestamp = moment(time).toDate();

    //time end day 23.59.59
    // const timeEnd = new Date(
    //   time.getFullYear(),
    //   time.getMonth(),
    //   time.getDate(),
    //   23,
    //   59,
    //   59
    // );

    //timestamp

    //console.log(timeEnd, new Date());
    const listOpen = await db
      .collection("medicines")
      .where("endDateTimestamp", ">=", timestamp)
      .where("history", "==", false)
      .get();

    //get time current hour and minute

    const hour = moment(time).format("HH");
    const minute = moment(time).format("mm");

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

      if (v.time === timeCurrent && timestamp > v.startDateTimestamp.toDate()) {
        //create history medicine
        const id = nanoid();
        await db
          .collection("history")
          .doc(id)
          .set({
            uid: v.uid,
            name: v.name,
            date: timestamp,
            dateText: moment(timestamp).format("DD/MM/YYYY"),
            type: v.type,
            amount: v.amount,
            eated: false,
            id: id,
            medicineId: v.docId,
            time: v.time,
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
}, 5000);

// app.listen(3000, () => {
//   console.log("Listening on port 3000");
// });
