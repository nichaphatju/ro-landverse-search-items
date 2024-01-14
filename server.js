const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const functions = require("firebase-functions");

const apiBaseUrl = 'https://apps.maxion.gg';
const itemInfoUrl = 'https://cdn.maxion.gg/landverse/web/iteminfo.min.json';
const marketAPIPath = '/api/market/list';

const itemInfoFileName = 'itemInfo.json';

var itemInfo = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle GET request from frontend
app.get('/api/search', (req, res) => {

    const param = req.query;

    console.log('Requesting...')

    fs.readFile(`./${itemInfoFileName}`, "utf8", (error, data) => {
        console.log('read item')

        if (error) {
            console.log(error);
        }else{
            itemInfo = JSON.parse(data);
        }

        axios.get(`${apiBaseUrl}${marketAPIPath}?status=LISTING&category=${param.category}&serverId=${param.sv}`).then((resp) => {

            let respTxt = '';
            let count = 0;
    
            respTxt += `<div class="row">`;
            resp.data.forEach(ele => {
            
                if(filterResults(ele, param)){
                    count++;
                    respTxt += tranformData(ele);
                }
                
            });
    
            respTxt += `</div>`;
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({count: count, data: respTxt}));
    
        }).catch((err) => {
            console.error(err);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({data: 'Error'}));
        })

    });

});

app.get('/api/loaditeminfo', (req, res) => {

    console.log('loading item...')

    axios.request({
        method: "GET",
        url: itemInfoUrl
    }).then((resp) => {
       
        let items = {};
        resp.data.forEach((ele) => {
            items[ele.id] = {
                name: ele.name,
                desc: ele.desc.replaceAll('\n','<br/>')
            }
        });

        var outputLocation = path.resolve(itemInfoFileName);
        fs.writeFile(outputLocation, JSON.stringify(items, null, 4), function(err) {
            if(err) {
                console.log(err);
                res.send(JSON.stringify({result: 'failed', error: err}));
            } else {
                console.log("JSON saved to "+outputLocation);
                res.send(JSON.stringify({result: 'success', location: outputLocation}));
            }
        });
        
        
    }).catch((err) => {
        console.log(err);
    });


});

app.listen(port, () => {
  console.log(`Listening...`);
});

exports.app = functions.https.onRequest(app)



/** Filter by input parameters */
function filterResults(item, param){
    if(param.name && param.name != null && param.name !== undefined){
        if(!item.nft.nameEnglish.toLowerCase().includes(param.name.trim().toLowerCase())){
            return false;
        }
    }

    let op0 = item.nft.option0Text ? item.nft.option0Text.toLowerCase() : '';
    let op1 = item.nft.option1Text ? item.nft.option1Text.toLowerCase() : '';
    let op2 = item.nft.option2Text ? item.nft.option2Text.toLowerCase() : '';
    let op3 = item.nft.option3Text ? item.nft.option3Text.toLowerCase() : '';
    let op4 = item.nft.option4Text ? item.nft.option4Text.toLowerCase() : '';

    if(param.ops && param.ops != null && param.ops !== undefined){
        let isEnchantWanted = op0.includes(param.ops.toLowerCase()) ||
                                op1.includes(param.ops.toLowerCase()) ||
                                op2.includes(param.ops.toLowerCase()) ||
                                op3.includes(param.ops.toLowerCase()) ||
                                op4.includes(param.ops.toLowerCase()) ;
        if(!isEnchantWanted){
            return false;
        }
    }
    
    if(param.minprice && param.minprice != null && param.minprice !== undefined){
        if(Number(item.price) < Number(param.minprice)){
            return false;
        }
    }

    if(param.maxprice && param.maxprice != null && param.maxprice !== undefined){
        if(Number(item.price) > Number(param.maxprice)){
            return false;
        }
    }

    if(param.card && param.card != 'all'){
        if(param.card == 'y' && (item.nft.card0Name == null || item.nft.card0Name === undefined)){
            return false;
        }else if(param.card == 'n' && (item.nft.card0Name != null && item.nft.card0Name !== undefined)){
            return false;
        }
    }

    //     "headgear": ["All", "Upper", "Middle", "Lower", "UpperMid", "MidLow", "UpperLow", "UpperMidLow"],
    //     "armor": ["All", "Armor", "Shields", "Gaments", "Footgears", "Accessory"],
    //     "card": ["All", "Armor", "Headgear", "Weapon", "Shield", "Garment", "Footgear", "Accessory"] ,
    //     "shadowgear": ["All"],
    //     "costume": ["All"]

    if(param.subtype && param.subtype != 'All'){
        let subtypeCompare = param.subtype.toLowerCase();
        let subtypeItem = item.nft.subtype ? item.nft.subtype.toLowerCase() : '';
        if(param.category == 'weapon'){
            if(!subtypeItem.includes(subtypeCompare)){
                return false;
            }
        }else if(param.category == 'headgear'){
            if(subtypeCompare == 'upper' && item.nft.locationHeadTop != 1){
                return false;
            }else if(subtypeCompare == 'middle' && item.nft.locationHeadMid != 1){
                return false;
            }else if(subtypeCompare == 'lower' && item.nft.locationHeadLow != 1){
                return false;
            }else if(subtypeCompare == 'uppermid' && (item.nft.locationHeadTop != 1 || item.nft.locationHeadMid != 1)){
                return false;
            }else if(subtypeCompare == 'midlow' && (item.nft.locationHeadMid != 1 || item.nft.locationHeadLow != 1)){
                return false;
            }else if(subtypeCompare == 'upperlow' && (item.nft.locationHeadTop != 1 || item.nft.locationHeadLow != 1)){
                return false;
            }else if(subtypeCompare == 'uppermidlow' && (item.nft.locationHeadTop != 1 || item.nft.locationHeadMid != 1 || item.nft.locationHeadLow != 1)){
                return false;
            }
        }
    }

    let allJobs = ["All", "Acolyte", "Alchemist", "Archer", "Assassin", "Barddancer", "Blacksmith", "Crusader", "Gunslinger", "Hunter", "Kagerouoboro", "Knight", "Mage", "Merchant", "Monk", "Ninja", "Novice", "Priest", "Rebellion", "Rogue", "Sage", "Soullinker", "Stargladiator", "Summoner", "Supernovice", "Swordman", "Taekwon", "Thief", "Wizard"];
    let isNoRequirement = true;

    allJobs.forEach(job => {
        let jobAttr = `job${job}`;
        if(item.nft[jobAttr] != null){
            isNoRequirement = false;
        }
    });

    if(item.nft.type == 'Armor' || item.nft.type == 'Weapon'){
        if(param.job != 'Any' && !isNoRequirement){
            let jobAttr = `job${param.job}`;
            if(item.nft['jobAll'] != 1 && item.nft[jobAttr] != 1){
                return false;
            }
        }
    }
    

    return true;
}

function tranformData(item){
    let itemDetailTxt = '';
    let itemName = item.nft.nameEnglish;

    let createdAt = formatDate(new Date(item.nft.createdAt));
    let view = item.nft.view ? item.nft.view : null;

    if(item.nft.refine > 0){
        itemName += `+${item.nft.refine}`;
    }
    if(item.nft.slots > 0){
        itemName += `[${item.nft.slots}]`;
    }

    let colStyle = `col-sm-6 col-md-4`;
    if(item.nft.type == 'Card'){
        colStyle = `col-sm-12 col-md-3`;
    }

    itemDetailTxt += `<div class="${colStyle} px-1 py-1">`;
    itemDetailTxt += `<div class="card">`;

    /** Header */
    itemDetailTxt += `<h5 class="card-header">`;
    itemDetailTxt += `${item.id} - <b>${itemName}</b> - ราคา: <b>${item.price} ION </b>`;
    itemDetailTxt += `</h5>`;

    /** Body */
    itemDetailTxt += `<div class="card-body">`;
    itemDetailTxt += `<ul class="list-group list-group-flush">`;
    
    /** First section */
    itemDetailTxt += `<li class="list-group-item">`;
    // itemDetailTxt += `<p>${item.id} - <b>${itemName}</b> </p>`;
    itemDetailTxt += `ราคาเปิดขาย: ${item.initialPrice} ION</br>`;
    itemDetailTxt += `สร้างเมื่อ ${createdAt}</br>`;


    if(item.nft.type == 'Armor' || item.nft.type == 'Weapon'){
        if(item.nft.type == 'Armor'){
            
            level = `Armor Level: ${item.nft.armorLevel}`;

            itemDetailTxt += `Defense: ${item.nft.defense}</br>`;

        }else if(item.nft.type == 'Weapon'){
            
            level = `Weapon Level: ${item.nft.weaponLevel}`;
            
            itemDetailTxt += `Atk: ${item.nft.attack}</br>`;
            itemDetailTxt += `Matk: ${item.nft.magicAttack}</br>`;
        }

        itemDetailTxt += `${level}</br>`;

        /** Second section */
        itemDetailTxt += `<li class="list-group-item">`;

        itemDetailTxt += `<p> Enchant`;
        
        if(item.nft.option0Text){
            itemDetailTxt += `</p>`;
            itemDetailTxt += `1. ${item.nft.option0Text}</br>`;
            itemDetailTxt += `2. ${item.nft.option1Text}</br>`;
            itemDetailTxt += `3. ${item.nft.option2Text}</br>`;
            itemDetailTxt += `4. ${item.nft.option3Text}</br>`;
            itemDetailTxt += `5. ${item.nft.option4Text}</br>`;
        }else{
            itemDetailTxt += `: None</p>`;
        }

        /** Third section */
        itemDetailTxt += `</li><li class="list-group-item">`;
        itemDetailTxt += `<p> Card`;
        

        if(item.nft.card0Name){
            itemDetailTxt += `</p>`;
            itemDetailTxt += `1. ${item.nft.card0Name}</br>`;
            itemDetailTxt += `2. ${item.nft.card1Name}</br>`;
            itemDetailTxt += `3. ${item.nft.card2Name}</br>`;
            itemDetailTxt += `4. ${item.nft.card3Name}</br>`;
        }else{
            itemDetailTxt += `: None</p>`;
        }

        itemDetailTxt += ` </ul>`;
    }

    itemDetailTxt += 
        `   <button class="btn btn-outline-info btn-sm mt-1" type="button" data-toggle="collapse" data-target="#itemInfo${item.id}" aria-expanded="false" aria-controls="itemInfo${item.id}">
                View Item Detail
            </button>
            <a href="${apiBaseUrl}/roverse/detail/${item.id}" class="float-right btn btn-outline-primary btn-sm mt-1 ms-3" target="_blank">View/Buy</a>
                <div class="collapse" id="itemInfo${item.id}">
                    <div class="card card-body">
                        ${itemInfo[item.nft.nameid].desc}
                    </div>
                </div>`;

    // if(view != null){
    //     itemDetailTxt += `<p class="text-right mt-2">คนเข้าดู ${view} View</p>`;
    // }


    itemDetailTxt += `</div>`;
    itemDetailTxt += `</div>`;
    itemDetailTxt += `</div>`;
    itemDetailTxt += `<hr/>`;
    return    itemDetailTxt; 
}


function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}