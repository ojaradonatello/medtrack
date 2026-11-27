const Enrollment = require('../models/Enrollment');
const Patient = require('../models/Patient');

exports.getEnrollments = async (req, res) => {
  try {
    const filter = req.facilityId ? { facility: req.facilityId } : {};
    const enrollments = await Enrollment.find(filter)
      .populate('patient', 'name phone')
      .populate('enrolledBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ enrollments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEnrollment = async (req, res) => {
  try {
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    const enrollment = await Enrollment.findOne(filter).populate('patient').populate('enrolledBy', 'name');
    if (!enrollment) return res.status(404).json({ error: 'Not found' });
    res.json({ enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEnrollment = async (req, res) => {
  try {
    const { patient, type, programName, expiryDate, benefits, notes, programCategory } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!patient || !type || !programName || !expiryDate) {
      return res.status(400).json({ error: 'patient, type, programName, and expiryDate are required' });
    }

    const enrollment = await Enrollment.create({
      facility: req.facilityId || null,
      patient,
      type,
      programName,
      programCategory: programCategory || null,
      expiryDate,
      benefits: benefits || null,
      notes: notes || null,
      enrolledBy: userId,
      enrollmentNumber: `E-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      status: 'active'
    });

    const populated = await Enrollment.findById(enrollment._id).populate('patient', 'name phone').populate('enrolledBy', 'name');
    res.status(201).json({ message: 'Enrollment created', enrollment: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEnrollment = async (req, res) => {
  try {
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    const enrollment = await Enrollment.findOneAndUpdate(filter, req.body, { new: true });
    if (!enrollment) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEnrollment = async (req, res) => {
  try {
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    await Enrollment.findOneAndDelete(filter);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    const enrollment = await Enrollment.findOne(filter);
    if (!enrollment) return res.status(404).json({ error: 'Not found' });
    
    enrollment.payments.push({ amount, method: method || 'cash', paidAt: new Date(), collectedBy: req.user?.id });
    enrollment.totalPaid = (enrollment.totalPaid || 0) + Number(amount);
    await enrollment.save();
    res.json({ message: 'Payment added', enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.renewEnrollment = async (req, res) => {
  try {
    const { months, amount } = req.body;
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    const enrollment = await Enrollment.findOne(filter);
    if (!enrollment) return res.status(404).json({ error: 'Not found' });
    
    const newExpiry = new Date(enrollment.expiryDate);
    newExpiry.setMonth(newExpiry.getMonth() + Number(months));
    enrollment.expiryDate = newExpiry;
    enrollment.status = 'active';
    
    if (amount) {
      enrollment.payments.push({ amount, method: 'renewal', paidAt: new Date(), collectedBy: req.user?.id });
      enrollment.totalPaid = (enrollment.totalPaid || 0) + Number(amount);
    }
    await enrollment.save();
    res.json({ message: 'Renewed', enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelEnrollment = async (req, res) => {
  try {
    const { reason } = req.body;
    const filter = req.facilityId ? { _id: req.params.id, facility: req.facilityId } : { _id: req.params.id };
    const enrollment = await Enrollment.findOneAndUpdate(
      filter,
      { status: 'cancelled', cancelReason: reason, cancelledAt: new Date() },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Cancelled', enrollment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientEnrollments = async (req, res) => {
  try {
    const filter = req.facilityId ? { patient: req.params.patientId, facility: req.facilityId } : { patient: req.params.patientId };
    const enrollments = await Enrollment.find(filter).populate('patient');
    res.json({ enrollments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEnrollmentSummary = async (req, res) => {
  try {
    const filter = req.facilityId ? { facility: req.facilityId } : {};
    const [active, expired, expiringSoon] = await Promise.all([
      Enrollment.countDocuments({ ...filter, status: 'active' }),
      Enrollment.countDocuments({ ...filter, status: 'expired' }),
      Enrollment.countDocuments({ ...filter, status: 'active', expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } })
    ]);
    res.json({ summary: { totalActive: active, totalExpired: expired, expiringSoon } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};