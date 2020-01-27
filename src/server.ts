import 'reflect-metadata'
import Koa from 'koa'
import helmet from 'koa-helmet'
import session from 'koa-session'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import {useContainer, createConnection} from 'typeorm'
import {Container} from 'typedi'
import RedisStore from 'koa-redis'
import {signale} from '@/utils'
import {redisSessionClient} from '@/DB/redis'
import {ORMConfig, NODE_ENV} from '@config'
import router from '@/routes'
import {redirect, errorHandler} from '@/middlewares'
import makeKBFServer from '@/models/KBF'
import makeUsersServer from '@/models/UsersPlayground'

if (NODE_ENV === undefined)
	signale.error('process.env is undefined!')
else
	signale.info(`Environment: ${NODE_ENV}`)

export default async function main () {
	
	const app = new Koa()
	
	app.keys = ['session secret']
	
	useContainer(Container)
	
	const conn = await createConnection(ORMConfig)
	if (process.env.NODE_ENV !== 'production') {
		
		signale.warn('resetting the DB')
		await conn.synchronize(true)
		await redisSessionClient.flushdb()
		
	}
	const usersServer = await makeUsersServer()
	const KBFServer = await makeKBFServer()
	
	
	app
		.use(errorHandler)
		.use(redirect)
		.use(session({
			store: RedisStore({
				client: redisSessionClient,
			}),
			key: 'redisCookie',
		}, app))
		.on('error', error => console.log(error))
		.use(helmet({}))
		.use(cors({}))
		.use(bodyParser({}))
		.use(router.routes())
		.use(router.allowedMethods({}))
		
		.use(usersServer)
		.use(KBFServer)
	return app

}

