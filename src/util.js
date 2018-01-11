/**
 * Get Main Keyboard
 * @param {int} timestamp 
 */
function getNormalDate(timestamp) {
	let date = new Date()
	date.setTime(timestamp)

	let date1 = date.getDate()
	let month = date.getMonth() + 1
	let hours = date.getHours()
	let minutes = date.getMinutes()

	if (date1 < 10) date1 = '0' + date1 
	if (month < 10) month = '0' + month 
	if (hours < 10) hours = '0' + hours 
	if (minutes < 10) minutes = '0' + minutes  

	let result = date1 + '.' + month + '.' + date.getFullYear()
	result += ' ' + hours + ':' + minutes
	return result
}

module.exports = {
	getNormalDate
}
