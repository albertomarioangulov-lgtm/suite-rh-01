import type { Nitro } from 'nitropack'
import mongoose from 'mongoose'
import { consola } from 'consola'
import chalk from 'chalk'

// Importar los modelos Mongoose para que se registren al iniciar la aplicación.
// Esto es crítico para evitar el error "MissingSchemaError: Schema hasn't been
// registered for model..." en entornos serverless con cold starts.
import '~~/server/models/index'

const dbLog = consola.withTag('mongodb')

export default async (nitroApp: Nitro) => {
  const config = useRuntimeConfig()

  // Evita conexiones duplicadas, especialmente en desarrollo con HMR.
  if (mongoose.connection.readyState === 1) {
    dbLog.info(chalk.gray(`Reusing existing connection to ${config.mongodbName}.`))
    return
  }

  // 1. Validar configuración requerida
  if (!config.mongodbUri || !config.mongodbName) {
    dbLog.fatal(
      chalk.red.bold(
        'Missing `mongodbUri` or `mongodbName` in runtime config. Aborting connection.',
      ),
    )
    throw new Error('Database configuration is incomplete.')
  }

  const uri = `${config.mongodbUri}/${config.mongodbName}?retryWrites=true&w=majority`

  // Sanitizar la URI para el log: no exponer credenciales ni el cluster.
  const sanitizedUri = uri.replace(/\/\/(.*?)@([^/]+)/, '//****@<cluster>').replace(/\?.*$/, '')

  dbLog.start(`Connecting to ${chalk.cyan(sanitizedUri)}...`)

  try {
    // Registrar listeners ANTES de conectar para no perder eventos iniciales.
    mongoose.connection.on('connected', () => {
      dbLog.success(`✅ Connection to ${chalk.green.bold(config.mongodbName)} established.`)
    })

    mongoose.connection.on('error', (err) => {
      dbLog.error(`❌ Mongoose ${chalk.red('connection error')}:`, err)
    })

    mongoose.connection.on('disconnected', () => {
      dbLog.warn(`⚠️ ${chalk.yellow('Mongoose connection lost.')}`)
    })

    // 2. Opciones de conexión configurables
    const mongooseOptions = {
      serverSelectionTimeoutMS: config.mongodbServerSelectionTimeoutMS || 10000,
      maxPoolSize: config.mongodbMaxPoolSize || 10,
    }

    const connectStart = Date.now()
    await mongoose.connect(uri, {
      ...mongooseOptions,
    })
    const connectDuration = Date.now() - connectStart

    dbLog.success(
      `✅ Connection to ${chalk.green.bold(config.mongodbName)} established in ${chalk.cyan(`${connectDuration}ms`)}.`,
    )

    // Cierre ordenado de la conexión al detener la aplicación.
    nitroApp.hooks.hook('close', async () => {
      await mongoose.disconnect()
      dbLog.warn(`⚠️ ${chalk.yellow('Mongoose disconnected due to application shutdown.')}`)
    })
  } catch (e) {
    dbLog.error(`❌ ${chalk.red.bold('Initial connection failed:')}`, e)
    // Re-lanzar para que el contenedor muestre el error real en los logs.
    throw e
  }
}
