const winston = require('winston')
const { format } = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file');

const path = require('path');

const fileLogFormat = winston.format.printf(({ level, message, timestamp }) => {
	return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
	levels: winston.config.npm.levels,
	transports: [
		new winston.transports.Console({
			format: format.combine(
				winston.format.splat(),
				winston.format.cli(),
				winston.format.align(),
			),
			level: 'info',
		}),
	],
});

function addLogRotate(workspace) {
	const logRotate = new DailyRotateFile({
		format: format.combine(winston.format.splat(), winston.format.timestamp(), winston.format.padLevels(), fileLogFormat),
		level: 'debug',
		filename: path.resolve(workspace, 'logs', 'google-maps-webscrapper-%DATE%.log'),
		datePattern: 'YYYY-MM-DD',
		zippedArchive: true,
		maxSize: '20m',
		maxFiles: '7d',
	});

	logger.add(logRotate);
}

module.exports = {
	addLogRotate,
	logger
};

