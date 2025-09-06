const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database table
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    // Create SNS users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sns_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        sns_id VARCHAR(255) NOT NULL,
        stake DECIMAL(20,8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create spaces table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id SERIAL PRIMARY KEY,
        space_id VARCHAR(255) UNIQUE NOT NULL,
        space_contract_id VARCHAR(255),
        title VARCHAR(500),
        description TEXT,
        date DATE,
        location VARCHAR(500),
        location_link TEXT,
        features_enabled JSONB DEFAULT '[]',
        admins JSONB DEFAULT '[]',
        artwork TEXT,
        background TEXT,
        tags JSONB DEFAULT '[]',
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        stake_address VARCHAR(255) DEFAULT $1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, [process.env.DEFAULT_STAKE_ADDRESS || 'HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks']);
    
    // Create shops table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        shop_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        space_id VARCHAR(255) NOT NULL,
        up INTEGER DEFAULT 0,
        down INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        location VARCHAR(500),
        location_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE
      );
    `);

    // Create lend_items table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS lend_items (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        owner VARCHAR(255) NOT NULL,
        available BOOLEAN DEFAULT TRUE,
        up INTEGER DEFAULT 0,
        down INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        image TEXT,
        space_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE SET NULL
      );
    `);

    // Create requests table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        requester VARCHAR(255) NOT NULL,
        up INTEGER DEFAULT 0,
        down INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        space_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE SET NULL
      );
    `);

    // Create hangouts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS hangouts (
        id SERIAL PRIMARY KEY,
        hang_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        date DATE,
        location VARCHAR(500),
        host VARCHAR(255) NOT NULL,
        up INTEGER DEFAULT 0,
        down INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        space_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE SET NULL
      );
    `);
    
    // Add stake column to existing sns_users table if it doesn't exist
    await client.query(`
      ALTER TABLE sns_users 
      ADD COLUMN IF NOT EXISTS stake DECIMAL(20,8) DEFAULT 0;
    `);
    
    // Add stake_address column to existing spaces table if it doesn't exist
    await client.query(`
      ALTER TABLE spaces 
      ADD COLUMN IF NOT EXISTS stake_address VARCHAR(255) DEFAULT $1;
    `, [process.env.DEFAULT_STAKE_ADDRESS || 'HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks']);
    
    console.log('✅ Database tables initialized');
    client.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Initialize database on startup
initDatabase();

// Routes

// Add email + SNS ID
app.post('/api/sns', async (req, res) => {
  try {
    const { email, sns_id, stake } = req.body;
    
    if (!email || !sns_id) {
      return res.status(400).json({ 
        error: 'Email and SNS ID are required' 
      });
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT * FROM sns_users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateFields = ['sns_id = $1'];
      const updateValues = [sns_id];
      let paramCount = 1;
      
      if (stake !== undefined) {
        updateFields.push(`stake = $${++paramCount}`);
        updateValues.push(stake);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      const result = await pool.query(
        `UPDATE sns_users SET ${updateFields.join(', ')} WHERE email = $${++paramCount} RETURNING *`,
        [...updateValues, email]
      );
      
      return res.json({
        message: 'SNS ID updated successfully',
        user: result.rows[0]
      });
    } else {
      // Create new user
      const result = await pool.query(
        'INSERT INTO sns_users (email, sns_id, stake) VALUES ($1, $2, $3) RETURNING *',
        [email, sns_id, stake || 0]
      );
      
      return res.json({
        message: 'SNS ID added successfully',
        user: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Error adding/updating SNS ID:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Lookup SNS ID by email
app.get('/api/sns/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM sns_users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Email not found' 
      });
    }
    
    res.json({
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error looking up SNS ID:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get all SNS users
app.get('/api/sns', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sns_users ORDER BY created_at DESC'
    );
    
    res.json({
      users: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Update specific fields of an SNS user
app.patch('/api/sns/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updateData = req.body;
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No update data provided' 
      });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM sns_users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updateData).forEach(key => {
      if (key === 'email') return; // Don't allow updating email
      
      updateFields.push(`${key} = $${paramCount}`);
      updateValues.push(updateData[key]);
      paramCount++;
    });
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    const updateQuery = `
      UPDATE sns_users 
      SET ${updateFields.join(', ')} 
      WHERE email = $${paramCount} 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [...updateValues, email]);
    
    res.json({
      message: 'SNS user updated successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating SNS user:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ===== SPACES API ENDPOINTS =====

// Create or update a space (partial updates supported)
app.post('/api/spaces', async (req, res) => {
  try {
    const { 
      spaceId, 
      spacecontractid, 
      title, 
      description, 
      date, 
      location, 
      location_link,
      featuresEnabled, 
      admins, 
      artwork, 
      background, 
      tags, 
      upvotes, 
      downvotes,
      stakeAddress
    } = req.body;
    
    if (!spaceId) {
      return res.status(400).json({ 
        error: 'spaceId is required' 
      });
    }
    
    // Check if space already exists
    const existingSpace = await pool.query(
      'SELECT * FROM spaces WHERE space_id = $1',
      [spaceId]
    );
    
    if (existingSpace.rows.length > 0) {
      // Update existing space - only update provided fields
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (spacecontractid !== undefined) {
        updateFields.push(`space_contract_id = $${++paramCount}`);
        updateValues.push(spacecontractid);
      }
      if (title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(description);
      }
      if (date !== undefined) {
        updateFields.push(`date = $${++paramCount}`);
        updateValues.push(date);
      }
      if (location !== undefined) {
        updateFields.push(`location = $${++paramCount}`);
        updateValues.push(location);
      }
      if (location_link !== undefined) {
        updateFields.push(`location_link = $${++paramCount}`);
        updateValues.push(location_link);
      }
      if (featuresEnabled !== undefined) {
        updateFields.push(`features_enabled = $${++paramCount}`);
        updateValues.push(JSON.stringify(featuresEnabled));
      }
      if (admins !== undefined) {
        updateFields.push(`admins = $${++paramCount}`);
        updateValues.push(JSON.stringify(admins));
      }
      if (artwork !== undefined) {
        updateFields.push(`artwork = $${++paramCount}`);
        updateValues.push(artwork);
      }
      if (background !== undefined) {
        updateFields.push(`background = $${++paramCount}`);
        updateValues.push(background);
      }
      if (tags !== undefined) {
        updateFields.push(`tags = $${++paramCount}`);
        updateValues.push(JSON.stringify(tags));
      }
      if (upvotes !== undefined) {
        updateFields.push(`upvotes = $${++paramCount}`);
        updateValues.push(upvotes);
      }
      if (downvotes !== undefined) {
        updateFields.push(`downvotes = $${++paramCount}`);
        updateValues.push(downvotes);
      }
      if (stakeAddress !== undefined) {
        updateFields.push(`stake_address = $${++paramCount}`);
        updateValues.push(stakeAddress);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const updateQuery = `
        UPDATE spaces 
        SET ${updateFields.join(', ')} 
        WHERE space_id = $1 
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [spaceId, ...updateValues]);
      
      return res.json({
        message: 'Space updated successfully',
        space: result.rows[0]
      });
      
    } else {
      // Create new space
      const result = await pool.query(`
        INSERT INTO spaces (
          space_id, space_contract_id, title, description, date, 
          location, location_link, features_enabled, admins, 
          artwork, background, tags, upvotes, downvotes, stake_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
        RETURNING *
      `, [
        spaceId, 
        spacecontractid || null, 
        title || null, 
        description || null, 
        date || null, 
        location || null, 
        location_link || null, 
        JSON.stringify(featuresEnabled || []), 
        JSON.stringify(admins || []), 
        artwork || null, 
        background || null, 
        JSON.stringify(tags || []), 
        upvotes || 0, 
        downvotes || 0,
        stakeAddress || process.env.DEFAULT_STAKE_ADDRESS || 'HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks'
      ]);
      
      return res.json({
        message: 'Space created successfully',
        space: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Error creating/updating space:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get space by spaceId
app.get('/api/spaces/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM spaces WHERE space_id = $1',
      [spaceId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Space not found' 
      });
    }
    
    res.json({
      space: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error getting space:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get all spaces
app.get('/api/spaces', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM spaces ORDER BY created_at DESC'
    );
    
    res.json({
      spaces: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error getting all spaces:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Update specific fields of a space
app.patch('/api/spaces/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    const updateData = req.body;
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No update data provided' 
      });
    }
    
    // Check if space exists
    const existingSpace = await pool.query(
      'SELECT * FROM spaces WHERE space_id = $1',
      [spaceId]
    );
    
    if (existingSpace.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Space not found' 
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updateData).forEach(key => {
      if (key === 'spaceId') return; // Don't allow updating spaceId
      
      let dbColumn = key;
      if (key === 'spacecontractid') dbColumn = 'space_contract_id';
      if (key === 'location_link') dbColumn = 'location_link';
      if (key === 'featuresEnabled') dbColumn = 'features_enabled';
      if (key === 'stakeAddress') dbColumn = 'stake_address';
      
      updateFields.push(`${dbColumn} = $${++paramCount}`);
      
      // Handle JSON fields
      if (['featuresEnabled', 'admins', 'tags'].includes(key)) {
        updateValues.push(JSON.stringify(updateData[key]));
      } else {
        updateValues.push(updateData[key]);
      }
    });
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    const updateQuery = `
      UPDATE spaces 
      SET ${updateFields.join(', ')} 
      WHERE space_id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [spaceId, ...updateValues]);
    
    res.json({
      message: 'Space updated successfully',
      space: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Delete a space
app.delete('/api/spaces/:spaceId', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM spaces WHERE space_id = $1 RETURNING *',
      [spaceId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Space not found' 
      });
    }
    
    res.json({
      message: 'Space deleted successfully',
      deletedSpace: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ===== SHOPS API ENDPOINTS =====

// Create or update a shop
app.post('/api/shops', async (req, res) => {
  try {
    const { 
      shopId, 
      name, 
      description, 
      spaceId, 
      up, 
      down, 
      tags, 
      location, 
      location_link 
    } = req.body;
    
    if (!shopId || !name || !spaceId) {
      return res.status(400).json({ 
        error: 'shopId, name, and spaceId are required' 
      });
    }
    
    // Check if space exists
    const spaceExists = await pool.query(
      'SELECT space_id FROM spaces WHERE space_id = $1',
      [spaceId]
    );
    
    if (spaceExists.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Space not found. Create the space first.' 
      });
    }
    
    // Check if shop already exists
    const existingShop = await pool.query(
      'SELECT * FROM shops WHERE shop_id = $1',
      [shopId]
    );
    
    if (existingShop.rows.length > 0) {
      // Update existing shop
      const result = await pool.query(`
        UPDATE shops 
        SET name = $1, description = $2, space_id = $3, up = $4, down = $5, 
            tags = $6, location = $7, location_link = $8, updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = $9 
        RETURNING *
      `, [
        name, 
        description || null, 
        spaceId, 
        up || 0, 
        down || 0, 
        JSON.stringify(tags || []), 
        location || null, 
        location_link || null, 
        shopId
      ]);
      
      return res.json({
        message: 'Shop updated successfully',
        shop: result.rows[0]
      });
      
    } else {
      // Create new shop
      const result = await pool.query(`
        INSERT INTO shops (
          shop_id, name, description, space_id, up, down, tags, location, location_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *
      `, [
        shopId, 
        name, 
        description || null, 
        spaceId, 
        up || 0, 
        down || 0, 
        JSON.stringify(tags || []), 
        location || null, 
        location_link || null
      ]);
      
      return res.json({
        message: 'Shop created successfully',
        shop: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('Error creating/updating shop:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get shop by shopId
app.get('/api/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const result = await pool.query(`
      SELECT s.*, sp.title as space_title, sp.description as space_description
      FROM shops s
      LEFT JOIN spaces sp ON s.space_id = sp.space_id
      WHERE s.shop_id = $1
    `, [shopId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Shop not found' 
      });
    }
    
    res.json({
      shop: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error getting shop:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get all shops in a specific space
app.get('/api/spaces/:spaceId/shops', async (req, res) => {
  try {
    const { spaceId } = req.params;
    
    // Check if space exists
    const spaceExists = await pool.query(
      'SELECT space_id FROM spaces WHERE space_id = $1',
      [spaceId]
    );
    
    if (spaceExists.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Space not found' 
      });
    }
    
    const result = await pool.query(`
      SELECT s.*, sp.title as space_title
      FROM shops s
      LEFT JOIN spaces sp ON s.space_id = sp.space_id
      WHERE s.space_id = $1
      ORDER BY s.created_at DESC
    `, [spaceId]);
    
    res.json({
      shops: result.rows,
      count: result.rows.length,
      space_id: spaceId
    });
    
  } catch (error) {
    console.error('Error getting shops in space:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get all shops
app.get('/api/shops', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sp.title as space_title
      FROM shops s
      LEFT JOIN spaces sp ON s.space_id = sp.space_id
      ORDER BY s.created_at DESC
    `);
    
    res.json({
      shops: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error getting all shops:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Update specific fields of a shop
app.patch('/api/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const updateData = req.body;
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No update data provided' 
      });
    }
    
    // Check if shop exists
    const existingShop = await pool.query(
      'SELECT * FROM shops WHERE shop_id = $1',
      [shopId]
    );
    
    if (existingShop.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Shop not found' 
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updateData).forEach(key => {
      if (key === 'shopId') return; // Don't allow updating shopId
      
      let dbColumn = key;
      if (key === 'location_link') dbColumn = 'location_link';
      
      updateFields.push(`${dbColumn} = $${++paramCount}`);
      
      // Handle JSON fields
      if (key === 'tags') {
        updateValues.push(JSON.stringify(updateData[key]));
      } else {
        updateValues.push(updateData[key]);
      }
    });
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    const updateQuery = `
      UPDATE shops 
      SET ${updateFields.join(', ')} 
      WHERE shop_id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [shopId, ...updateValues]);
    
    res.json({
      message: 'Shop updated successfully',
      shop: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Delete a shop
app.delete('/api/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM shops WHERE shop_id = $1 RETURNING *',
      [shopId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Shop not found' 
      });
    }
    
    res.json({
      message: 'Shop deleted successfully',
      deletedShop: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ===== LEND ITEMS API ENDPOINTS =====

// Create or update a lend item
app.post('/api/lend-items', async (req, res) => {
  try {
    const {
      id: itemId,
      name,
      description,
      owner,
      available,
      up,
      down,
      tags,
      image,
      spaceId
    } = req.body;

    if (!itemId || !name || !owner) {
      return res.status(400).json({
        error: 'id, name, and owner are required'
      });
    }

    // If spaceId provided, ensure it exists
    if (spaceId) {
      const spaceExists = await pool.query(
        'SELECT space_id FROM spaces WHERE space_id = $1',
        [spaceId]
      );
      if (spaceExists.rows.length === 0) {
        return res.status(400).json({ error: 'Space not found. Create the space first.' });
      }
    }

    // Check if item exists
    const existing = await pool.query(
      'SELECT * FROM lend_items WHERE item_id = $1',
      [itemId]
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(`
        UPDATE lend_items
        SET name = $1, description = $2, owner = $3, available = $4,
            up = $5, down = $6, tags = $7, image = $8, space_id = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE item_id = $10
        RETURNING *
      `, [
        name,
        description || null,
        owner,
        available !== undefined ? available : true,
        up || 0,
        down || 0,
        JSON.stringify(tags || []),
        image || null,
        spaceId || null,
        itemId
      ]);

      return res.json({ message: 'Lend item updated successfully', item: result.rows[0] });
    }

    const result = await pool.query(`
      INSERT INTO lend_items (
        item_id, name, description, owner, available, up, down, tags, image, space_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      itemId,
      name,
      description || null,
      owner,
      available !== undefined ? available : true,
      up || 0,
      down || 0,
      JSON.stringify(tags || []),
      image || null,
      spaceId || null
    ]);

    return res.json({ message: 'Lend item created successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Error creating/updating lend item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get one lend item by id
app.get('/api/lend-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT li.*, sp.title AS space_title
      FROM lend_items li
      LEFT JOIN spaces sp ON li.space_id = sp.space_id
      WHERE li.item_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lend item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error getting lend item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all lend items (optionally filter by spaceId)
app.get('/api/lend-items', async (req, res) => {
  try {
    const { spaceId } = req.query;

    if (spaceId) {
      const result = await pool.query(`
        SELECT li.*, sp.title AS space_title
        FROM lend_items li
        LEFT JOIN spaces sp ON li.space_id = sp.space_id
        WHERE li.space_id = $1
        ORDER BY li.created_at DESC
      `, [spaceId]);
      return res.json({ items: result.rows, count: result.rows.length, space_id: spaceId });
    }

    const result = await pool.query(`
      SELECT li.*, sp.title AS space_title
      FROM lend_items li
      LEFT JOIN spaces sp ON li.space_id = sp.space_id
      ORDER BY li.created_at DESC
    `);
    res.json({ items: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error getting lend items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Patch a lend item
app.patch('/api/lend-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const existing = await pool.query('SELECT * FROM lend_items WHERE item_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lend item not found' });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (key === 'id') return;
      let dbColumn = key;
      if (key === 'spaceId') dbColumn = 'space_id';
      updateFields.push(`${dbColumn} = $${++paramCount}`);
      if (key === 'tags') {
        updateValues.push(JSON.stringify(updateData[key]));
      } else {
        updateValues.push(updateData[key]);
      }
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const updateQuery = `
      UPDATE lend_items
      SET ${updateFields.join(', ')}
      WHERE item_id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [id, ...updateValues]);
    res.json({ message: 'Lend item updated successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Error patching lend item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a lend item
app.delete('/api/lend-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM lend_items WHERE item_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lend item not found' });
    }
    res.json({ message: 'Lend item deleted successfully', deletedItem: result.rows[0] });
  } catch (error) {
    console.error('Error deleting lend item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== REQUESTS API ENDPOINTS =====

// Create or update a request
app.post('/api/requests', async (req, res) => {
  try {
    const { id: requestId, title, description, requester, up, down, tags, spaceId } = req.body;
    if (!requestId || !title || !requester) {
      return res.status(400).json({ error: 'id, title, and requester are required' });
    }
    if (spaceId) {
      const spaceExists = await pool.query('SELECT space_id FROM spaces WHERE space_id = $1', [spaceId]);
      if (spaceExists.rows.length === 0) return res.status(400).json({ error: 'Space not found. Create the space first.' });
    }
    const existing = await pool.query('SELECT * FROM requests WHERE request_id = $1', [requestId]);
    if (existing.rows.length > 0) {
      const result = await pool.query(`
        UPDATE requests
        SET title = $1, description = $2, requester = $3, up = $4, down = $5,
            tags = $6, space_id = $7, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $8
        RETURNING *
      `, [title, description || null, requester, up || 0, down || 0, JSON.stringify(tags || []), spaceId || null, requestId]);
      return res.json({ message: 'Request updated successfully', request: result.rows[0] });
    }
    const result = await pool.query(`
      INSERT INTO requests (request_id, title, description, requester, up, down, tags, space_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [requestId, title, description || null, requester, up || 0, down || 0, JSON.stringify(tags || []), spaceId || null]);
    res.json({ message: 'Request created successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Error creating/updating request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT r.*, sp.title AS space_title
      FROM requests r
      LEFT JOIN spaces sp ON r.space_id = sp.space_id
      WHERE r.request_id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Error getting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const { spaceId } = req.query;
    if (spaceId) {
      const result = await pool.query(`
        SELECT r.*, sp.title AS space_title
        FROM requests r
        LEFT JOIN spaces sp ON r.space_id = sp.space_id
        WHERE r.space_id = $1
        ORDER BY r.created_at DESC
      `, [spaceId]);
      return res.json({ requests: result.rows, count: result.rows.length, space_id: spaceId });
    }
    const result = await pool.query(`
      SELECT r.*, sp.title AS space_title
      FROM requests r
      LEFT JOIN spaces sp ON r.space_id = sp.space_id
      ORDER BY r.created_at DESC
    `);
    res.json({ requests: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error getting requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No update data provided' });
    const existing = await pool.query('SELECT * FROM requests WHERE request_id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    Object.keys(updateData).forEach(key => {
      if (key === 'id') return;
      let dbColumn = key;
      if (key === 'spaceId') dbColumn = 'space_id';
      updateFields.push(`${dbColumn} = $${++paramCount}`);
      if (key === 'tags') updateValues.push(JSON.stringify(updateData[key]));
      else updateValues.push(updateData[key]);
    });
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    const updateQuery = `
      UPDATE requests SET ${updateFields.join(', ')} WHERE request_id = $1 RETURNING *
    `;
    const result = await pool.query(updateQuery, [id, ...updateValues]);
    res.json({ message: 'Request updated successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM requests WHERE request_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted successfully', deletedRequest: result.rows[0] });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== HANGOUTS API ENDPOINTS =====

// Create or update a hangout
app.post('/api/hangouts', async (req, res) => {
  try {
    const { id: hangId, title, description, date, location, host, up, down, tags, spaceId } = req.body;
    if (!hangId || !title || !host) return res.status(400).json({ error: 'id, title, and host are required' });
    if (spaceId) {
      const spaceExists = await pool.query('SELECT space_id FROM spaces WHERE space_id = $1', [spaceId]);
      if (spaceExists.rows.length === 0) return res.status(400).json({ error: 'Space not found. Create the space first.' });
    }
    const existing = await pool.query('SELECT * FROM hangouts WHERE hang_id = $1', [hangId]);
    if (existing.rows.length > 0) {
      const result = await pool.query(`
        UPDATE hangouts
        SET title = $1, description = $2, date = $3, location = $4, host = $5,
            up = $6, down = $7, tags = $8, space_id = $9, updated_at = CURRENT_TIMESTAMP
        WHERE hang_id = $10
        RETURNING *
      `, [title, description || null, date || null, location || null, host, up || 0, down || 0, JSON.stringify(tags || []), spaceId || null, hangId]);
      return res.json({ message: 'Hangout updated successfully', hangout: result.rows[0] });
    }
    const result = await pool.query(`
      INSERT INTO hangouts (hang_id, title, description, date, location, host, up, down, tags, space_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [hangId, title, description || null, date || null, location || null, host, up || 0, down || 0, JSON.stringify(tags || []), spaceId || null]);
    res.json({ message: 'Hangout created successfully', hangout: result.rows[0] });
  } catch (error) {
    console.error('Error creating/updating hangout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hangouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT h.*, sp.title AS space_title
      FROM hangouts h
      LEFT JOIN spaces sp ON h.space_id = sp.space_id
      WHERE h.hang_id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hangout not found' });
    res.json({ hangout: result.rows[0] });
  } catch (error) {
    console.error('Error getting hangout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hangouts', async (req, res) => {
  try {
    const { spaceId } = req.query;
    if (spaceId) {
      const result = await pool.query(`
        SELECT h.*, sp.title AS space_title
        FROM hangouts h
        LEFT JOIN spaces sp ON h.space_id = sp.space_id
        WHERE h.space_id = $1
        ORDER BY h.created_at DESC
      `, [spaceId]);
      return res.json({ hangouts: result.rows, count: result.rows.length, space_id: spaceId });
    }
    const result = await pool.query(`
      SELECT h.*, sp.title AS space_title
      FROM hangouts h
      LEFT JOIN spaces sp ON h.space_id = sp.space_id
      ORDER BY h.created_at DESC
    `);
    res.json({ hangouts: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error getting hangouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/hangouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No update data provided' });
    const existing = await pool.query('SELECT * FROM hangouts WHERE hang_id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Hangout not found' });
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    Object.keys(updateData).forEach(key => {
      if (key === 'id') return;
      let dbColumn = key;
      if (key === 'spaceId') dbColumn = 'space_id';
      updateFields.push(`${dbColumn} = $${++paramCount}`);
      if (key === 'tags') updateValues.push(JSON.stringify(updateData[key]));
      else updateValues.push(updateData[key]);
    });
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    const updateQuery = `
      UPDATE hangouts SET ${updateFields.join(', ')} WHERE hang_id = $1 RETURNING *
    `;
    const result = await pool.query(updateQuery, [id, ...updateValues]);
    res.json({ message: 'Hangout updated successfully', hangout: result.rows[0] });
  } catch (error) {
    console.error('Error updating hangout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/hangouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM hangouts WHERE hang_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hangout not found' });
    res.json({ message: 'Hangout deleted successfully', deletedHangout: result.rows[0] });
  } catch (error) {
    console.error('Error deleting hangout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`\n📝 SNS Endpoints:`);
  console.log(`   Add SNS ID: POST http://localhost:${PORT}/api/sns`);
  console.log(`   Lookup SNS ID: GET http://localhost:${PORT}/api/sns/:email`);
  console.log(`   Get all users: GET http://localhost:${PORT}/api/sns`);
  console.log(`   Update SNS user: PATCH http://localhost:${PORT}/api/sns/:email`);
  console.log(`\n🌐 Spaces Endpoints:`);
  console.log(`   Create/Update Space: POST http://localhost:${PORT}/api/spaces`);
  console.log(`   Get Space: GET http://localhost:${PORT}/api/spaces/:spaceId`);
  console.log(`   Get All Spaces: GET http://localhost:${PORT}/api/spaces`);
  console.log(`   Update Space: PATCH http://localhost:${PORT}/api/spaces/:spaceId`);
  console.log(`   Delete Space: DELETE http://localhost:${PORT}/api/spaces/:spaceId`);
  console.log(`\n🛒 Shops Endpoints:`);
  console.log(`   Create/Update Shop: POST http://localhost:${PORT}/api/shops`);
  console.log(`   Get Shop: GET http://localhost:${PORT}/api/shops/:shopId`);
  console.log(`   Get Shops in Space: GET http://localhost:${PORT}/api/spaces/:spaceId/shops`);
  console.log(`   Get All Shops: GET http://localhost:${PORT}/api/shops`);
  console.log(`   Update Shop: PATCH http://localhost:${PORT}/api/shops/:shopId`);
  console.log(`   Delete Shop: DELETE http://localhost:${PORT}/api/shops/:shopId`);
  console.log(`\n🔁 Lend Items Endpoints:`);
  console.log(`   Create/Update Lend Item: POST http://localhost:${PORT}/api/lend-items`);
  console.log(`   Get Lend Item: GET http://localhost:${PORT}/api/lend-items/:id`);
  console.log(`   Get All/By Space Lend Items: GET http://localhost:${PORT}/api/lend-items[?spaceId=...]`);
  console.log(`   Update Lend Item: PATCH http://localhost:${PORT}/api/lend-items/:id`);
  console.log(`   Delete Lend Item: DELETE http://localhost:${PORT}/api/lend-items/:id`);
  console.log(`\n📨 Requests Endpoints:`);
  console.log(`   Create/Update Request: POST http://localhost:${PORT}/api/requests`);
  console.log(`   Get Request: GET http://localhost:${PORT}/api/requests/:id`);
  console.log(`   Get All/By Space Requests: GET http://localhost:${PORT}/api/requests[?spaceId=...]`);
  console.log(`   Update Request: PATCH http://localhost:${PORT}/api/requests/:id`);
  console.log(`   Delete Request: DELETE http://localhost:${PORT}/api/requests/:id`);
  console.log(`\n🤝 Hangouts Endpoints:`);
  console.log(`   Create/Update Hangout: POST http://localhost:${PORT}/api/hangouts`);
  console.log(`   Get Hangout: GET http://localhost:${PORT}/api/hangouts/:id`);
  console.log(`   Get All/By Space Hangouts: GET http://localhost:${PORT}/api/hangouts[?spaceId=...]`);
  console.log(`   Update Hangout: PATCH http://localhost:${PORT}/api/hangouts/:id`);
  console.log(`   Delete Hangout: DELETE http://localhost:${PORT}/api/hangouts/:id`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});
