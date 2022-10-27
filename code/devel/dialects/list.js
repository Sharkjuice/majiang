define(['./mjdialect_hh.js', './mjdialect_hb.js', './mjdialect_simple.js', '../common/mjtable.js'], 
function (_1, _2, _3, mjtable) {
    mjtable.Table.setDialect(_1.name(), _1)
    mjtable.Table.setDialect(_2.name(), _2)
    mjtable.Table.setDialect(_3.name(), _3)
})