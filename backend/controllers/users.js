const bcrypt = require('bcrypt')
const router = require('express').Router()

const { User, Note, Team } = require('../models')
const { tokenExtractor } = require('../util/middleware')

const isAdmin = async (req, res, next) => {
  const user = await User.findByPk(req.decodedToken.id)
  if (!user.admin) {
    return res.status(401).json({ error: 'operation not permitted' })
  }
  next()
}

router.put('/:username', tokenExtractor, isAdmin, async (req, res) => {
  const user = await User.findOne({ 
    where: { 
      username: req.params.username
    }
  })

  if (user) {
    user.disabled = req.body.disabled
    await user.save()
    res.json(user)
  } else {
    res.status(404).end()
  }
})

router.get('/', async (req, res) => {
  const users = await User.findAll({ 
    include: [
      {
        model: Note,
        attributes: { exclude: ['userId'] } 
      }, 
      { 
        model: Note, 
        as: 'markedNotes',
        attributes: { exclude: ['userId']},
        through: {
          attributes: []
        },
      },
      {
        model: Team,
        attributes: ['name', 'id'],
        through: {
          attributes: []
        }
      }
    ]
  })
  res.json(users)
})

router.post('/', async (req, res) => {
  try {
    const { password } = req.body
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const user = await User.create({...req.body, password_hash: passwordHash})
    res.json(user)
  } catch(error) {
    return res.status(400).json({ error })
  }
})

router.get('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id)
  if (!user) {
    return res.status(404).end()
  }

  let teams = undefined

  if (req.query.teams) {
    teams = await user.getTeams({
      attributes: ['name'],
      joinTableAttributes: []  
    })
  }

  res.json({ ...user.toJSON(), teams })
})

module.exports = router