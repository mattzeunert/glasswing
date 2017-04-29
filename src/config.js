const config = {
    MAX_ARRAY_VALUES_TO_COLLECT: 5,
    MAX_OBJECT_PROPERTY_VALUES_TO_COLLECT: 5,
    MAX_STRING_LENGTH_SHALLOW: 1000,
    MAX_STRING_LENGTH_DEEP: 100
}
if(typeof module !== "undefined"){
    module.exports = config
}