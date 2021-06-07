require('dotenv').config()
const moment = require('moment');
const cron = require('node-cron');
const axios = require('axios');
const notifier = require('./notifier');
let searchCount = 0;
/**
Step 1) Enable application access on your gmail with steps given here:
 https://support.google.com/accounts/answer/185833?p=InvalidSecondFactor&visit_id=637554658548216477-2576856839&rd=1

Step 2) Enter the details in the file .env, present in the same folder

Step 3) On your terminal run: npm i && pm2 start vaccineNotifier.js

To close the app, run: pm2 stop vaccineNotifier.js && pm2 delete vaccineNotifier.js
 */

const PINCODE = process.env.PINCODE
const EMAIL = process.env.EMAIL
const AGE = process.env.AGE
const districtId = process.env.DISTRICT_ID

async function main(){
    try {
        cron.schedule('* * * * *', async () => {
             await checkAvailability();
        });
    } catch (e) {
        console.log('an error occured: ' + JSON.stringify(e, null, 2));
        throw e;
    }
}

async function checkAvailability() {

    let datesArray = await fetchNext10Days();
    datesArray.forEach(date => {
        getSlotsForDate(date);
    })
}

function getSlotsForDate(DATE) {
    ++searchCount;
    let config = {
        method: 'get',
        url: 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=' + districtId + '&date=' + DATE,
        headers: {
            'accept': 'application/json',
            'Accept-Language': 'hi_IN',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
            'authorization':' Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiI2YTA2ZWU5Mi1jZWRhLTRlNWItOTY0Mi0wM2M3Y2I3MWE5YjQiLCJ1c2VyX2lkIjoiNmEwNmVlOTItY2VkYS00ZTViLTk2NDItMDNjN2NiNzFhOWI0IiwidXNlcl90eXBlIjoiQkVORUZJQ0lBUlkiLCJtb2JpbGVfbnVtYmVyIjo5NTE4MTA2MTM4LCJiZW5lZmljaWFyeV9yZWZlcmVuY2VfaWQiOjgyMzQ1MjQ1MTAxMDMwLCJzZWNyZXRfa2V5IjoiYjVjYWIxNjctNzk3Ny00ZGYxLTgwMjctYTYzYWExNDRmMDRlIiwic291cmNlIjoiY293aW4iLCJ1YSI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS85MS4wLjQ0NzIuNzcgU2FmYXJpLzUzNy4zNiIsImRhdGVfbW9kaWZpZWQiOiIyMDIxLTA2LTA3VDE5OjAzOjQ0LjI0NFoiLCJpYXQiOjE2MjMwOTI2MjQsImV4cCI6MTYyMzA5MzUyNH0.diNhua-XMH4d3GZWQO65y89xhAVyzuMGfD9HEOHybpo',
        }
    };

    axios(config)
        .then(function (slots) {
            let centers = slots.data.centers;
            let validSlots = centers.filter(center =>{
                for(let slot  of center.sessions){
                    if(slot.min_age_limit <= AGE &&  slot.available_capacity > 0 && slot.vaccine === "COVAXIN" && slot.available_capacity_dose2 > 0)
                       return true;
                }
            })
            console.log(validSlots);
            console.log({date:DATE, validSlots: validSlots.length})
            if(validSlots.length > 0) {
                notifyMe(validSlots);
            }
        })
        .catch(function (error) {
            console.log("Error happened" );
        });
}

async function

notifyMe(validSlots){
    let slotDetails = JSON.stringify(validSlots, null, '\t');
    notifier.sendEmail(EMAIL, validSlots[0].name, slotDetails, (err, result) => {
        if(err) {
            console.error({err});
        }
    })
};

async function fetchNext10Days(){
    let dates = [];
    let today = moment();
    for(let i = 0 ; i < 10 ; i ++ ){
        let dateString = today.format('DD-MM-YYYY')
        dates.push(dateString);
        today.add(1, 'day');
    }
    return dates;
}


main()
    .then(() => {console.log('Vaccine availability checker started.');});
