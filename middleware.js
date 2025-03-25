const axios = require("axios");
const db = require("./db");

// middleware.js
const adminList = ["fuzzy681"];

/**
* 
* @params {Object} headers - additional headers to be included in the request
*/
function createHeaders(headers = {}) {
   return {
       'Authorization':  `Bearer ${process.env.TOKEN_ECLESIAR}`,
       // 'Cookie': `ECLESIARSESS=${process.env.SESSION_ECLESIAR}`,
       'Content-Type': 'application/x-www-form-urlencoded',
       ...headers,
   }
}
module.exports = {
    isAdmin(username) {
        return adminList.includes(username)
    },
    getCountdown(timeStamp, startTimeStamp = null) {
        if (!startTimeStamp) startTimeStamp = Math.floor(Date.now() / 1000)
        let timeLeft = timeStamp - startTimeStamp;
        function padZero(num) {
          return num < 10 ? `0${num}` : `${num}`;
        }
        const hours = padZero(Math.floor(timeLeft / 3600));
        const minutes = padZero(Math.floor((timeLeft % 3600) / 60));
        const seconds = padZero(timeLeft % 60);
        return `${hours}:${minutes}:${seconds}`;
    },
    async fetchWars() {
      const warsUrl = `https://api.eclesiar.com/wars?extra_details=1`;
      try {
          const response = await axios.get(warsUrl, { headers: createHeaders() });
          if (response.status === 200) {
            const warsData = response.data?.data;
            if (warsData) {
              warsData.forEach((war) => {
                const { id: warId, attackers, defenders, region } = war;
      
                // Insert or update war details in the database
                db.run(
                  `
                  INSERT INTO war_details (warId, attackerName, defenderName, regionName)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(warId) DO UPDATE SET
                    attackerName = excluded.attackerName,
                    defenderName = excluded.defenderName,
                    regionName = excluded.regionName
                  `,
                  [warId, attackers.name, defenders.name, region.name],
                  (err) => {
                    if (err) console.error("Error updating war details:", err);
                  }
                );
              });
            }
            return warsData;
          } else {
            throw new Error("Failed to fetch wars.");
          }
      } catch (error) {
          console.error(`Error fetching wars:`, error);
          return null;
      }
    },

    async fetchWarStatus(roundId) {
      const warStatusUrl = "https://api.eclesiar.com/war/status";
      try {
        const response = await axios.post(
          warStatusUrl,
          new URLSearchParams({ round_id: roundId }).toString(),
          { headers: createHeaders() }
        );

        if (response.status === 200) {
          const warStatusData = response.data?.data;
          return warStatusData;
        } else {
          throw new Error("Failed to fetch status.");
        }
      } catch (error) {
        console.error(`Error fetching war status:`, error);
        return null;
      }
    }
};
