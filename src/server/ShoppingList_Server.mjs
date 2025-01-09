// ShoppingList_Server.mjs

import express from 'express';
import pkg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pkg;

const app = express();
const port = process.env.SERVER_PORT || 8001;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    res.send(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.send('Error ' + err);
  }
});

app.get('/aisles', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM aisles');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error ' + err);
  }
});

app.get('/products', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM products');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error ' + err);
  }
});

app.get('/shops', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM shops');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error ' + err);
  }
});

app.get('/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error ' + err);
  }
});

app.get('/lists', async (req, res) => {
  try {
    const client = await pool.connect();

    const query = `
        SELECT json_agg(
          json_build_object(
            'user_id', u.user_id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'shopping_lists', (
              SELECT json_agg(
                json_build_object(
                  'list_shop_id', sls.list_shop_id,
                  'shop_name', s.shop_name,
                  'address', s.address,
                  'contact_number', s.contact_number,
                  'website', s.website,
                  'aisles', (
                    SELECT json_agg(
                      json_build_object(
                        'aisle_id', a.aisle_id,
                        'name', a.name,
                        'description', a.description,
                        'products', (
                          SELECT json_agg(
                            json_build_object(
                              'product_id', p.product_id,
                              'name', p.name,
                              'notes', lap.notes,
                              'quantity', lap.quantity,
                              'price', lap.price
                            )
                          )
                          FROM list_aisle_products lap
                          JOIN products p ON lap.product_id = p.product_id
                          WHERE lap.list_shop_id = lsa.list_shop_id AND lap.aisle_id = lsa.aisle_id
                        )
                      )
                    )
                    FROM list_shop_aisles lsa
                    JOIN aisles a ON lsa.aisle_id = a.aisle_id
                    WHERE lsa.list_shop_id = sls.list_shop_id
                  )
                )
              )
              FROM shopping_list_shops sls
              JOIN shops s ON sls.shop_id = s.shop_id
              WHERE sls.user_id = u.user_id
            )
          )
        ) AS users_data
        FROM users u;
      `;

    const result = await client.query(query);

    if (result.rows.length === 0 || !result.rows[0].users_data) {
      res.status(404).send('No users or shopping lists found');
    } else {
      res.json(result.rows[0].users_data);
    }

    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

app.get('/lists/:id', async (req, res) => {
  try {
    const client = await pool.connect();

    const query = `
SELECT json_build_object(
      'user_id', u.user_id,
      'first_name', u.first_name,
      'last_name', u.last_name,
      'email', u.email,
      'shopping_lists', (
        SELECT json_agg(
          json_build_object(
            'list_shop_id', sls.list_shop_id,
            'shop_name', s.shop_name,
            'address', s.address,
            'contact_number', s.contact_number,
            'website', s.website,
            'aisles', (
              SELECT json_agg(
                json_build_object(
                  'aisle_id', a.aisle_id,
                  'name', a.name,
                  'description', a.description,
                  'products', (
                    SELECT json_agg(
                      json_build_object(
                        'product_id', p.product_id,
                        'name', p.name,
                        'notes', lap.notes,
                        'quantity', lap.quantity,
                        'price', lap.price
                      )
                    )
                    FROM list_aisle_products lap
                    JOIN products p ON lap.product_id = p.product_id
                    WHERE lap.list_shop_id = lsa.list_shop_id AND lap.aisle_id = lsa.aisle_id
                  )
                )
              )
              FROM list_shop_aisles lsa
              JOIN aisles a ON lsa.aisle_id = a.aisle_id
              WHERE lsa.list_shop_id = sls.list_shop_id
            )
          )
        )
        FROM shopping_list_shops sls
        JOIN shops s ON sls.shop_id = s.shop_id
        WHERE sls.user_id = u.user_id
      )
    ) AS user_data
    FROM users u
    WHERE u.user_id = $1;
`;

    const result = await client.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).send('User not found');
    } else {
      res.json(result.rows[0].user_data);
    }

    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});