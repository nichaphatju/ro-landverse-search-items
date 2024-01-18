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

app.use('/img', express.static(__dirname + '/public/images'));

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


        //ใช้ decodeURI แล้วถ้ากรอก % มามัน error (กรอก Spacebar แล้วเป็น %20)
        param.ops1 = param.ops1.replaceAll("%20"," ");
        param.ops2 = param.ops2.replaceAll("%20"," ");
        console.log("Option 1 : " + param.ops1.toString());
        console.log("Option 2 : " + param.ops2.toString());

        axios.get(`${apiBaseUrl}${marketAPIPath}?status=LISTING&category=${param.category}&serverId=${param.sv}`).then((resp) => {

            let respTxt = '';
            let count = 0;
    
            respTxt += `<div class="row">`;

            if(param.sort != 0){
                resp.data.sort((a,b) => {
                    if(param.sort == 1){
                        return a.price - b.price;
                    }else if(param.sort == 2){
                        return b.price - a.price;
                    }
                });
            }

            resp.data.forEach(ele => {
            
                if(filterResults(ele, param)){
                    count++;
                    respTxt += tranformData(ele);
                }
                
            });
    
            respTxt += `</div>`;
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({result: 'success', count: count, data: respTxt}));
    
        }).catch((err) => {
            console.error(err);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({result: 'failed', error: err, data: null}));
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

    //console.log(item.nftId);
    // if(item.nftId == "132285")
    // {
    //     console.log(op0);
    //     console.log(op1);
    //     console.log(op2);
    //     console.log(op3);
    //     console.log(op4);
    // }
    // else
    // {
    //     return false;
    // }

    let isCostume = item.nft.locationCostumeHeadTop || item.nft.locationCostumeHeadMid || item.nft.locationCostumeHeadLow || item.nft.locationCostumeGarment;
    if(isCostume){
        op0 += item.nft.card0Name ? item.nft.card0Name.toLowerCase() : '';
        op1 += item.nft.card1Name ? item.nft.card1Name.toLowerCase() : '';
        op2 += item.nft.card2Name ? item.nft.card2Name.toLowerCase() : '';
        op3 += item.nft.card3Name ? item.nft.card3Name.toLowerCase() : '';
    }

    let opt = `${op0}${op1}${op2}${op3}${op4}`;

    if(param.enchantopt != 'n'){
             
        //================== แก้ไข การหา Option 1 และ 2 =================
        if(
            (param.ops1 && param.ops1 != null && param.ops1 !== undefined) &&
            (param.ops2 && param.ops2 != null && param.ops2 !== undefined)
          )
        {
                var status = false;
                console.log("CASE : 1")
                console.log("ITEM OPTION 0 : " + op0 + " : " + param.ops1.toLowerCase())
                console.log("ITEM OPTION 1 : " + op1 + " : " + param.ops2.toLowerCase())

                //กรณีต้องการ 2 ออบเหมือนกัน
                //เช็ค 2 ออบที่กรอกมาเหมือนกันไหม
                if(param.ops1 == param.ops2)
                {
                    //เช็ค Item 2 ออบแรกเหมือนกันไหม
                    if((item.nft.optionId0 == item.nft.optionId1) && (item.nft.optionId0 != "0" && item.nft.optionId1 != "0"))
                    {
                        //กรณีเหมือนคือ เช็คอีกทีว่าเป็นออบที่เราเลือกมาไหม
                        if(param.ops1 == item.nft.optionId0 && param.ops2 == item.nft.optionId1)
                        {
                            //แสดงว่าเป็น Item ที่ต้องนำไปแสดง
                            status = true
                        }
                    }
                }
                else
                {
                    //กรณี 2 ออบแรกไม่เหมือนกัน
                    if(
                        (param.ops1==item.nft.optionId0) && (param.ops2==item.nft.optionId1) || 
                        (param.ops2==item.nft.optionId0) && (param.ops1==item.nft.optionId1)
                      )
                    {
                        status = false;
                    }
                }
    
                
                return status;
                
        }
        else if(param.ops1 && param.ops1 != null && param.ops1 !== undefined)
        {
            var status = false;
            //กรณีกรอกมาแต่ Param 1
            console.log("CASE : 2")
            if(param.ops1==item.nft.optionId0)
            {
                status = true;
            }

            switch (param.ops1) {
                case item.nft.optionId0:
                case item.nft.optionId1:
                case item.nft.optionId2:
                case item.nft.optionId3:
                case item.nft.optionId4:
                    status = true;
                  break;
              }

            if(!status)
            {
                return false;
            }

        }
        else if(param.ops2 && param.ops2 != null && param.ops2 !== undefined)
        {
            var status = false;
            //กรณีกรอกมาแต่ Param 2
            console.log("CASE : 3")
            switch (param.ops2) {
                case item.nft.optionId0:
                case item.nft.optionId1:
                case item.nft.optionId2:
                case item.nft.optionId3:
                case item.nft.optionId4:
                    status = true;
                  break;
              }

            if(!status)
            {
                return false;
            }
        }
        //==============================================================

        if(param.enchantopt == 'y'){
            if(opt.length == 0){
                return false;
            }
        }

    }else{
        
        if(opt.length > 0){
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

    if(param.subtype && param.subtype != 'all'){
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

    if(item.nft.type == 'Armor' || item.nft.type == 'Weapon' || item.nft.type == 'Shadowgear'){
        if(param.job != 'Any' && !isNoRequirement){
            let jobAttr = `job${param.job}`;
            if(item.nft['jobAll'] != 1 && item.nft[jobAttr] != 1){
                return false;
            }
        }

        if(param.refine != 'all'){
            if(param.refine == 0){
                if(Number(item.nft.refine) > 0){
                    return false;
                }
            }else if(item.nft.refine < param.refine){
                return false;
            }
        }
        
    }


    return true;
}

function tranformData(item){
    let itemDetailTxt = '';

    let itemName = '';
    if(item.nft.attribute == 2){
        itemName += `<p style="color:red; display:inline">Broken </p>`;
    }
    itemName += item.nft.nameEnglish;

    let createdAt = formatDate(new Date(item.createdAt));
    let view = item.nft.view ? item.nft.view : null;

    let currentItemInfo = itemInfo[item.nft.nameid];

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

        itemDetailTxt += `<p> <b>Enchant</b>`;
        
        if(item.nft.option0Text || item.nft.option1Text || item.nft.option2Text || item.nft.option3Text || item.nft.option4Text){
            itemDetailTxt += `</p>`;
            itemDetailTxt += `1. ${item.nft.option0Text ? item.nft.option0Text : '-'}</br>`;
            itemDetailTxt += `2. ${item.nft.option1Text ? item.nft.option1Text : '-'}</br>`;
            itemDetailTxt += `3. ${item.nft.option2Text ? item.nft.option2Text : '-'}</br>`;
            itemDetailTxt += `4. ${item.nft.option3Text ? item.nft.option3Text : '-'}</br>`;
            itemDetailTxt += `5. ${item.nft.option4Text ? item.nft.option4Text : '-'}</br>`;
        }else{
            itemDetailTxt += `: None</p>`;
        }

        /** Third section */
        itemDetailTxt += `</li><li class="list-group-item">`;
        itemDetailTxt += `<p> <b>Card Slots</b>`;
        

        if(item.nft.card0Name || item.nft.card1Name || item.nft.card2Name || item.nft.card3Name){
            itemDetailTxt += `</p>`;
            itemDetailTxt += `1. ${item.nft.card0Name ? item.nft.card0Name : '-'}</br>`;
            itemDetailTxt += `2. ${item.nft.card1Name ? item.nft.card1Name : '-'}</br>`;
            itemDetailTxt += `3. ${item.nft.card2Name ? item.nft.card2Name : '-'}</br>`;
            itemDetailTxt += `4. ${item.nft.card3Name ? item.nft.card3Name : '-'}</br>`;
        }else{
            itemDetailTxt += `: None</p>`;
        }

        itemDetailTxt += ` </ul>`;
    }else if(item.nft.type == 'Card'){
        var cardCollectionEffect = currentItemInfo.desc.substring(currentItemInfo.desc.indexOf('Collection Effect')+17, currentItemInfo.desc.length);
        itemDetailTxt += `<p class="my-2"><b>Collection Effect</b>${cardCollectionEffect}</p>`;
    }

    if(item.nft.type == 'Shadowgear'){
        itemDetailTxt += `</br><p> <b>Item Detail</b> </p>`;
        itemDetailTxt += `<p style="height:10rem; overflow:scroll" >${currentItemInfo.desc}</br></p>`;
        itemDetailTxt += `<a href="${apiBaseUrl}/roverse/detail/${item.id}" class="float-right btn btn-outline-primary btn-sm mt-1 ms-3" target="_blank">View/Buy</a>`;
    }else{
        itemDetailTxt += 
        `   <button class="btn btn-outline-info btn-sm mt-1" type="button" data-toggle="collapse" data-target="#itemInfo${item.id}" aria-expanded="false" aria-controls="itemInfo${item.id}">
                View Item Detail
            </button>
            <a href="${apiBaseUrl}/roverse/detail/${item.id}" class="float-right btn btn-outline-primary btn-sm mt-1 ms-3" target="_blank">View/Buy</a>
                <div class="collapse" id="itemInfo${item.id}">
                    <div class="card card-body">
                        ${currentItemInfo.desc.replaceAll(`Collection Effect${cardCollectionEffect}`, '')}
                    </div>
                </div>`;
    }

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