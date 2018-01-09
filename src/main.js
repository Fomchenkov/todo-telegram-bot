import TeleBot from 'telebot'
import sqliteModule from 'sqlite3'

const BOT_TOKEN = process.argv[2]
const bot = new TeleBot(BOT_TOKEN)
const sqlite3 = sqliteModule.verbose()
const dbName = 'db.db'

let newNoteProcess = {}

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
	return new Promise((res, rej) => {
		let data = []
        const db = new sqlite3.Database(dbName);
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
 * Delete User Note
 * @param {int} noteId 
 */
async function deleteUserNote(noteId) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('DELETE FROM notes WHERE id=?');
		stmt.run(noteId);
		stmt.finalize();
	})
	db.close()
}

/**
 * Change User Note
 * @param {string} text 
 */
async function editUserNote(text) {

}

/**
 * Create User Note
 * @param {int} uid 
 */
async function addUserNote(uid, text, date) {
	const db = new sqlite3.Database(dbName)
	db.serialize(() => {
		let stmt = db.prepare('INSERT INTO notes (owner, text, date) VALUES (?, ?, ?)');
		stmt.run(uid, text, date);
		stmt.finalize();
	})
	db.close()
}

/**
 * Get Note Object
 * @param {int} noteId 
 */
function getNote(noteId) {
	return new Promise((res, rej) => {
        const db = new sqlite3.Database(dbName);
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
		['➕ Создать заметку', '🗓 Все заметки']
	], {resize: true})
}

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

		// Handle main buttons
		if (message.text == '➕ Создать заметку') {
			newNoteProcess[uid] = {}
			console.log(newNoteProcess)
			let replyMarkup = bot.keyboard([
				['⬅️ Назад']
			], {resize: true})
			return bot.sendMessage(cid, 'Введите текст заметки', {replyMarkup})
		} else if (message.text == '🗓 Все заметки') {
			getUserNotes(uid).then(notes => {
				console.log('Notes', notes)
				if (notes.length == 0) {
					let text = 'Нет заметок'
					return bot.sendMessage(cid, text)
				}
				(async () => {
					for (let i = 0; i < notes.length; i++) {
						let text = notes[i].text
						if (text.length > 300) {
							text = text.slice(0, 300) + '...'
						}
						let date = getNormalDate(notes[i].date)
						
						let markup = bot.inlineKeyboard([
							[
								bot.inlineButton('⬇️ Развернуть', {callback: `expand_${notes[i].id}`}),
								bot.inlineButton('❌ Удалить', {callback: `delete_${notes[i].id}`})
							]
						])
						await bot.sendMessage(cid, `${text}\n\n[${date}]`, {markup})
					}
				})()
			}).catch(e => console.log(e))
		}
	})()
})

bot.on('callbackQuery', call => {
	if (call.data.startsWith('delete')) {
		let noteId = call.data.split('_')[1]
		console.log('delete', noteId)
		deleteUserNote(noteId)
		bot.deleteMessage(call.message.chat.id, 
			call.message.message_id).catch(e => console.log(e))
		bot.answerCallbackQuery(call.id, {text: 'Удалено'})
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
			let date1 = getNormalDate(date)
			let fullText = `${text}\n\n[${date1}]`
			bot.editMessageText({
				chatId: call.message.chat.id, 
				messageId: call.message.message_id
			}, fullText, {markup}).catch(error => console.log('Error:', error))
			bot.answerCallbackQuery(call.id)
		})		
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
			let date1 = getNormalDate(date)
			let fullText = `${text}\n\n[${date1}]`
			bot.editMessageText({
				chatId: call.message.chat.id, 
				messageId: call.message.message_id
			}, fullText, {markup}).catch(error => console.log('Error:', error))
			bot.answerCallbackQuery(call.id)
		})		
	}
})

async function main() {
	await deployDataBase()
	bot.connect()
}

main()
