const { PrismaClient } = require('@prisma/client');
const { actions } = require('./action.js'); // Ensure this path is correct
const prisma = new PrismaClient()

async function dbOperator(action, payload) {
    switch (action) {
        case actions.SHEET_INSERT_DATA: {
            const sheet = await prisma.sheet.create({
                data: {
                    name: payload.name,
                    url: payload.url,
                    date: new Date(),
                    count: payload.count,
                    status: payload.status,
                },
            });
            return sheet;
        }
        case actions.SHEET_UPDATE_DATA: {
            const sheet = await prisma.sheet.update({
                where: {
                    id: payload.id, // Assuming payload contains 'id' to identify the record
                },
                data: {
                    name: payload.name,
                    url: payload.url,
                    count: payload.count,
                    status: payload.status,
                },
            });
            return sheet;
        }
        case actions.SHEET_DELETE_DATA: {
            const sheet = await prisma.sheet.delete({
                where: {
                    id: payload.id, // Assuming payload contains 'id' to identify the record
                },
            });
            return sheet;
        }
        case actions.SHEET_READ_DATA: {
            const sheets = await prisma.sheet.findMany({});
            return sheets;
        }
        default:
            throw new Error('Action not recognized');
    }
}

module.exports = { dbOperator };
