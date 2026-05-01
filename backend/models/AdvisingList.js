const mongoose = require('mongoose');

const advisingListSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    advisor:{
        type: String,
        ref: 'Staff'
    },
    students: [
        {student:{
            type: String,
            ref: 'Student',
            unique: true,
      sparse: true
        }}

    ],
    studentsCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });


advisingListSchema.methods.calculateStudentsCount = async function(){
    this.studentsCount = this.students.length;
    await this.save()
}



module.exports = mongoose.model('AdvisingList', advisingListSchema);