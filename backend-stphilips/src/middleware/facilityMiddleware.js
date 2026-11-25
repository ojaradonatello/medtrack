const Facility = require("../models/Facility");

function getFacilityId(req) {
  return req.user?.facilityId || req.user?.facility?._id || req.user?.facility || null;
}

async function attachFacility(req, res, next) {
  try {
    const facilityId = getFacilityId(req);

    if (!facilityId) {
      req.facility = null;
      req.facilityId = null;
      return next();
    }

    const facility = await Facility.findById(facilityId).lean();

    if (!facility) {
      return res.status(404).json({
        error: "Facility not found for this user.",
      });
    }

    if (facility.isActive === false) {
      return res.status(403).json({
        error: "This facility is currently inactive.",
      });
    }

    req.facility = facility;
    req.facilityId = facility._id;

    return next();
  } catch (err) {
    console.log("ATTACH FACILITY ERROR:", err);

    return res.status(500).json({
      error: "Failed to load facility context.",
    });
  }
}

function requireFacility(req, res, next) {
  if (!req.facilityId) {
    return res.status(403).json({
      error: "No facility assigned to this user. Contact administrator.",
    });
  }

  return next();
}

function facilityScopedQuery(req, baseFilter = {}) {
  const facilityId = req.facilityId;

  if (!facilityId) {
    return null;
  }

  return {
    ...baseFilter,
    facility: facilityId,
  };
}

function facilityScopedCreate(req, baseData = {}) {
  const facilityId = req.facilityId;

  if (!facilityId) {
    return null;
  }

  return {
    ...baseData,
    facility: facilityId,
  };
}

function hasModule(req, key) {
  if (!req.facility) {
    return false;
  }

  const modules = req.facility.modules;

  if (!modules) {
    return false;
  }

  if (typeof modules === "object" && !(modules instanceof Map)) {
    return modules[key] === true;
  }

  if (modules instanceof Map) {
    return modules.get(key) === true;
  }

  return false;
}

function requireModule(key) {
  return (req, res, next) => {
    if (!hasModule(req, key)) {
      return res.status(403).json({
        error: `This facility has not enabled the "${key}" module.`,
      });
    }

    return next();
  };
}

module.exports = {
  attachFacility,
  requireFacility,
  facilityScopedQuery,
  facilityScopedCreate,
  hasModule,
  requireModule,
  getFacilityId,
};