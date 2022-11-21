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
      //.where("history", "==", false)
      .get();

    //get time current hour and minute

    console.log("listOpen", listOpen.size);

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
          history1: false,
          history2: false,
          history3: false,
          history4: false,
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

      let time = 0;
      let keyTime = "";

      if (v.time1 === timeCurrent) {
        time = 1;
        keyTime = "time1";
      } else if (v.time2 === timeCurrent) {
        time = 2;
        keyTime = "time2";
      } else if (v.time3 === timeCurrent) {
        time = 3;
        keyTime = "time3";
      } else if (v.time4 === timeCurrent) {
        time = 4;
        keyTime = "time4";
      }

      if (time > 0 && timestamp > v.startDateTimestamp.toDate()) {
        console.log("create history", v.name);

        const doc = await (
          await db.collection("medicines").doc(v.docId).get()
        ).data();

        if (doc[`history${time}`] == true) {
          return;
        }

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
            time: v[keyTime],
            startDate: v.startDate,
            endDate: v.endDate,
            typeeat: v.typeeat,
          });

        //update status medicine eated
        const docId = listOpen.docs[i].id;
        await db
          .collection("medicines")
          .doc(docId)
          .update({
            [`history${time}`]: true,
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
