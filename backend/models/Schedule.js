const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({

    periodsTime:[
        {
            
            startTime: {
                type: String,
                
            },
            endTime: {
                type: String,
                
            }
        }
    ]

});



module.exports = mongoose.model('Schedule', scheduleSchema);