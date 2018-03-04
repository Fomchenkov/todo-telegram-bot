import TeleBot from 'telebot'
import sqliteModule from 'sqlite3'
import util from './util.js'

const BOT_TOKEN = process.argv[2]
const bot = new TeleBot(BOT_TOKEN)
const sqlite3 = sqliteModule.verbose()
const dbName = 'db.db'

let newNoteProcess = {}
let newBuyProcess = {}

const aboutBotText = 'Бот для создания заметок и списков покупок.'
const aboutDeveloperText = 'Бот разработан студией Kronver.\n\n\
Разработчик: @fomchenkov_v\n\
Официальный бот: @Kronver_bot\n'

/**
 * Deploy Data Base
 */
async function deployDataBase() {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		db.run('CREATE TABLE IF NOT EXISTS notes (\
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
			owner INTEGER NOT NULL,\
			text TEXT,\
			date TEXT NOT NULL)')
		db.run('CREATE TABLE IF NOT EXISTS buys (\
			id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
			owner INTEGER NOT NULL,\
			text TEXT,\
			date TEXT NOT NULL)')
	})
	db.close()
}

/**
 * Note Base Class
 */
class Note {
	constructor(id, text, date) {
		this._id = id
		this._text = text
		this._date = date
	}
	get id() {
		return this._id
	}
	get text() {
		return this._text
	}
	get date() {
		return this._date
	}
}

/**
 * Get User Notes
 * @param {int} uid 
 */
function getUserNotes(uid) {
	return new Promise((res) => {
		let data = []
		const db = new sqlite3.Database(dbName)
		db.serialize(() => {
			db.all(`SELECT * FROM notes WHERE owner=${uid} ORDER BY date`, (err, rows) => {
				if (err) {
					console.log(err)
					return
				}
				rows.forEach((row) => {
					data.push(new Note(row['id'], row['text'], row['date']))
				})
				res(data)
			})
		})
		db.close()
	})
}

/**
 * Get User Buys
 * @param {int} uid 
 */
function getUserBuys(uid) {
	return new Promise((res) => {
		let data = []
		const db = new sqlite3.Database(dbName)
		db.serialize(() => {
			db.all(`SELECT * FROM buys WHERE owner=${uid} ORDER BY date`, (err, rows) => {
				if (err) {
					console.log(err)
					return
				}
				rows.forEach((row) => {
					data.push(new Note(row['id'], row['text'], row['date']))
				})
				res(data)
			})
		})
		db.close()
	})
}

/**
 * Delete User Note
 * @param {int} noteId 
 */
async function deleteUserNote(noteId) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('DELETE FROM notes WHERE id=?')
		stmt.run(noteId)
		stmt.finalize()
	})
	db.close()
}

/**
 * Delete User Buy
 * @param {int} buyId 
 */
async function deleteUserBuy(buyId) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('DELETE FROM buys WHERE id=?')
		stmt.run(buyId)
		stmt.finalize()
	})
	db.close()
}

/**
 * Create User Note
 * @param {int} uid
 * @param {date} date
 */
async function addUserNote(uid, text, date) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('INSERT INTO notes (owner, text, date) VALUES (?, ?, ?)')
		stmt.run(uid, text, date)
		stmt.finalize()
	})
	db.close()
}

/**
 * Create User Buy
 * @param {int} uid
 * @param {date} date
 */
async function addUserBuy(uid, text, date) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('INSERT INTO buys (owner, text, date) VALUES (?, ?, ?)')
		stmt.run(uid, text, date)
		stmt.finalize()
	})
	db.close()
}

/**
 * Get Note Object
 * @param {int} noteId 
 */
function getNote(noteId) {
	return new Promise((res) => {
		const db = new sqlite3.Database(dbName)
		db.serialize(() => {
			db.all(`SELECT * FROM notes WHERE id=${noteId}`, (err, rows) => {
				if (err) {
					console.log(err)
					return
				}
				rows.forEach((row) => {
					console.log('log', row.text, row.date)
					res(new Note(row.id, row.text, row.date))
				})
			})
		})
		db.close()
	})
}

/**
 * Get Main Keyboard
 */
function getMainKeyboard() {
	return bot.keyboard([
		['➕ Создать заметку', '🗓 Все заметки'],
		['➕ Создать покупку', '🗂 Все покупки'],
		['ℹ️ О боте', 'ℹ️ О разработчике'],
	], {resize: true})
}

bot.on(['/start'], message => {
	let replyMarkup = getMainKeyboard()
	let text = 'Главное меню'
	return bot.sendMessage(message.from.id, text, {replyMarkup})
})

bot.on(['/help'], message => {
	let replyMarkup = getMainKeyboard()
	let text = 'ToDoKronverBot — это простой список дел или список задач.'
	text += ' Запиши в него все свои важные дела, чтобы не забыть'
	return bot.sendMessage(message.from.id, text, {replyMarkup})
})

bot.on('text', message => {
	(async () => {
		// Ignore commands
		if (message.text[0] == '/') {
			return
		}

		let cid = message.chat.id
		let uid = message.from.id

		// Back all actions
		if (message.text == '⬅️ Назад') {
			if (newNoteProcess[uid]) {
				delete newNoteProcess[uid]
				console.log(newNoteProcess)
			}
			if (newBuyProcess[uid]) {
				delete newBuyProcess[uid]
				console.log(newBuyProcess)
			}
			let text = 'Действие отменено'
			let replyMarkup = getMainKeyboard()
			return bot.sendMessage(cid, text, {replyMarkup})
		}

		if (newNoteProcess[uid]) {
			await addUserNote(uid, message.text, Date.now())
			delete newNoteProcess[uid]
			console.log(newNoteProcess)
			let replyMarkup = getMainKeyboard()
			let text = 'Заметка создана'
			return bot.sendMessage(cid, text, {replyMarkup})
		}

		if (newBuyProcess[uid]) {
			await addUserBuy(uid, message.text, Date.now())
			delete newBuyProcess[uid]
			console.log(newBuyProcess)
			let replyMarkup = getMainKeyboard()
			let text = 'Покупка создана'
			return bot.sendMessage(cid, text, {replyMarkup})
		}

		// Handle main buttons
		if (message.text == '➕ Создать заметку') {
			newNoteProcess[uid] = {}
			console.log(newNoteProcess)
			let replyMarkup = bot.keyboard([
				['⬅️ Назад']
			], {resize: true})
			return bot.sendMessage(cid, 'Введите текст заметки', {replyMarkup})
		} else if (message.text == '🗓 Все заметки') {
			let notes = await getUserNotes(uid)
			console.log('Notes', notes)
			if (notes.length == 0) {
				let text = 'Нет заметок'
				return bot.sendMessage(cid, text)
			}
			for (let i = 0; i < notes.length; i++) {
				let text = notes[i].text
				if (text.length > 300) {
					text = text.slice(0, 300) + '...'
				}
				let date = util.getNormalDate(notes[i].date)
	
				let markup = bot.inlineKeyboard([
					[
						bot.inlineButton('⬇️ Развернуть', {callback: `expand_${notes[i].id}`}),
						bot.inlineButton('❌ Удалить', {callback: `delete_${notes[i].id}`})
					]
				])
				await bot.sendMessage(cid, `${text}\n\n[${date}]`, {markup}).catch(e => console.log(e))
			}
		} else if (message.text == '➕ Создать покупку') {
			newBuyProcess[uid] = {}
			console.log(newBuyProcess)
			let replyMarkup = bot.keyboard([
				['⬅️ Назад']
			], {resize: true})
			return bot.sendMessage(cid, 'Введите название покупки', {replyMarkup})
		} else if (message.text == '🗂 Все покупки') {
			let buys = await getUserBuys(uid)
			console.log('Byus', buys)
			if (buys.length == 0) {
				let text = 'Нет покупок'
				return bot.sendMessage(cid, text)
			}
			for (let i = 0; i < buys.length; i++) {
				let text = buys[i].text
				if (text.length > 300) {
					text = text.slice(0, 300) + '...'
				}
				let date = util.getNormalDate(buys[i].date)
	
				let markup = bot.inlineKeyboard([
					[
						bot.inlineButton('✅ Куплено', {callback: `buyed_${buys[i].id}`})
					]
				])
				await bot.sendMessage(cid, `${text}\n\n[${date}]`, {markup}).catch(e => console.log(e))
			}
		} else if (message.text == 'ℹ️ О боте') {
			return bot.sendMessage(cid, aboutBotText)
		} else if (message.text == 'ℹ️ О разработчике') {
			return bot.sendMessage(cid, aboutDeveloperText)
		}
	})()
})

bot.on('callbackQuery', call => {
	if (call.data.startsWith('delete')) {
		let noteId = call.data.split('_')[1]
		console.log('delete', noteId)
		let markup = bot.inlineKeyboard([
			[
				bot.inlineButton('Удалить', {callback: `truedelete_${noteId}`}),
				bot.inlineButton('Отмена', {callback: `calceldelete_${noteId}`})
			]
		])
		let fullText = call.message.text
		bot.editMessageText({
			chatId: call.message.chat.id, 
			messageId: call.message.message_id
		}, fullText, {markup}).catch(error => console.log('Error:', error))
		bot.answerCallbackQuery(call.id)
	} else if (call.data.startsWith('truedelete_')) {
		let noteId = call.data.split('_')[1]
		console.log('truedelete_', noteId)
		deleteUserNote(noteId)
		bot.deleteMessage(call.message.chat.id, 
			call.message.message_id).catch(e => console.log(e))
		bot.answerCallbackQuery(call.id, {text: 'Удалено'})
	} else if (call.data.startsWith('calceldelete')) {
		let noteId = call.data.split('_')[1]
		console.log('calceldelete', noteId)
		getNote(noteId).then(note => {
			let text = note.text
			if (text.length > 300) {
				text = text.slice(0, 300) + '...'
			}
			let date = util.getNormalDate(note.date)
			let fullText = `${text}\n\n[${date}]`
			let markup = bot.inlineKeyboard([
				[
					bot.inlineButton('⬇️ Развернуть', {callback: `expand_${noteId}`}),
					bot.inlineButton('❌ Удалить', {callback: `delete_${noteId}`})
				]
			])
			bot.editMessageText({
				chatId: call.message.chat.id, 
				messageId: call.message.message_id
			}, fullText, {markup}).catch(error => console.log('Error:', error))
		}).catch(e => console.log(e))
	} else if (call.data.startsWith('expand')) {
		let noteId = call.data.split('_')[1]
		console.log('expand', noteId)
		let markup = bot.inlineKeyboard([
			[
				bot.inlineButton('⬆️ Cвернуть', {callback: `rollup_${noteId}`}),
				bot.inlineButton('❌ Удалить', {callback: `delete_${noteId}`})
			]
		])
		getNote(noteId).then(note => {
			let text = note.text
			let date = note.date 
			console.log('date', date)
			let date1 = util.getNormalDate(date)
			let fullText = `${text}\n\n[${date1}]`
			bot.editMessageText({
				chatId: call.message.chat.id, 
				messageId: call.message.message_id
			}, fullText, {markup}).catch(error => console.log('Error:', error))
			bot.answerCallbackQuery(call.id)
		}).catch(e => console.log(e))
	} else if (call.data.startsWith('rollup')) {
		let noteId = call.data.split('_')[1]
		console.log('rollup', noteId)
		let markup = bot.inlineKeyboard([
			[
				bot.inlineButton('⬇️ Развернуть', {callback: `expand_${noteId}`}),
				bot.inlineButton('❌ Удалить', {callback: `delete_${noteId}`})
			]
		])
		getNote(noteId).then(note => {
			let text = note.text
			let date = note.date 
			if (text.length > 300) {
				text = text.slice(0, 300) + '...'
			}
			let date1 = util.getNormalDate(date)
			let fullText = `${text}\n\n[${date1}]`
			bot.editMessageText({
				chatId: call.message.chat.id, 
				messageId: call.message.message_id
			}, fullText, {markup}).catch(error => console.log('Error:', error))
			bot.answerCallbackQuery(call.id)
		}).catch(e => console.log(e))
	} else if (call.data.startsWith('buyed')) {
		let buyId = call.data.split('_')[1]
		console.log('buyed_', buyId)
		deleteUserBuy(buyId)
		bot.deleteMessage(call.message.chat.id, 
			call.message.message_id).catch(e => console.log(e))
		bot.answerCallbackQuery(call.id, {text: 'Куплено!'})
	}
})

async function main() {
	await deployDataBase()
	bot.connect()
}

main()
