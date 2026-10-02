
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import vm from 'node:vm';

import Product from '../models/Product.js';

dotenv.config();

const FRONTEND_PRODUCTS_URL =
  'https://raw.githubusercontent.com/imran5513428/vault-khazana-website/main/src/data/products.js';

/**
 * Extract a JavaScript array declaration from products.js.
 *
 * This allows us to use the approved frontend catalog directly
 * without manually copying hundreds of product objects.
 */
function extractArrayDeclaration(source, declaration) {
  const startMarker = `export const ${declaration} =`;

  const startIndex = source.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error(
      `Could not find "${startMarker}" in frontend products.js`
    );
  }

  const arrayStart = source.indexOf('[', startIndex);

  if (arrayStart === -1) {
    throw new Error(
      `Could not find the opening array for ${declaration}`
    );
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
      }

      continue;
    }

    if (blockComment) {
      if (char === '*' && nextChar === '/') {
        blockComment = false;
        index += 1;
      }

      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (
      char === '/' &&
      nextChar === '/'
    ) {
      lineComment = true;
      index += 1;
      continue;
    }

    if (
      char === '/' &&
      nextChar === '*'
    ) {
      blockComment = true;
      index += 1;
      continue;
    }

    if (
      char === "'" ||
      char === '"' ||
      char === '`'
    ) {
      quote = char;
      continue;
    }

    if (char === '[') {
      depth += 1;
      continue;
    }

    if (char === ']') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error(
    `Could not find the closing array for ${declaration}`
  );
}

/**
 * Evaluate only the CATEGORIES and PRODUCTS declarations.
 *
 * The source comes from the user's own GitHub repository.
 * No application code is executed.
 */
function evaluateCatalog(source) {
  const categoriesArray = extractArrayDeclaration(
    source,
    'CATEGORIES'
  );

  const productsArray = extractArrayDeclaration(
    source,
    'PRODUCTS'
  );

  const script = `
    const CATEGORIES = ${categoriesArray};
    const PRODUCTS = ${productsArray};

    result = {
      categories: CATEGORIES,
      products: PRODUCTS
    };
  `;

  const context = {};

  vm.createContext(context);

  vm.runInContext(script, context, {
    timeout: 5000
  });

  return context.result;
}

/**
 * Fetch the approved frontend catalog.
 */
async function fetchFrontendCatalog() {
  console.log('📦 Fetching approved frontend catalog...');
  console.log(FRONTEND_PRODUCTS_URL);

  const response = await fetch(FRONTEND_PRODUCTS_URL);

  if (!response.ok) {
    throw new Error(
      `Could not fetch products.js. HTTP ${response.status}`
    );
  }

  const source = await response.text();

  if (!source.includes('export const PRODUCTS')) {
    throw new Error(
      'Fetched file does not appear to be the expected products.js'
    );
  }

  return evaluateCatalog(source);
}

/**
 * Convert one frontend product into the backend Product model.
 *
 * We deliberately do not import stockCount as real inventory.
 * The storefront currently uses an "in stock" model without
 * individual inventory tracking.
 */
function mapProduct(product, categoriesById) {
  const categoryName =
    categoriesById.get(product.categoryId) || product.categoryId;

  const pricePerUnit = Number(
    product.pricePerUnit ??
    product.unitPrice ??
    product.price ??
    0
  );

  const mappedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,

    description: product.description || product.overview || '',

    categoryId: product.categoryId,
    categoryName,

    imageSlug: product.imageSlug,

    dimensions: product.dimensions,
    material: product.material,
    color: product.colour || product.color,

    pricePerUnit,

    unitPrice:
      product.unitPrice !== undefined
        ? Number(product.unitPrice)
        : pricePerUnit,

    sellingUnit: product.sellingUnit || 'piece',

    moq: Number(product.moq || 1),
    step: Number(product.step || 1),

    packSize:
      product.packSize !== null &&
      product.packSize !== undefined
        ? Number(product.packSize)
        : undefined,

    inStock: true,

    trackInventory: false,

    stockQuantity: 0,

    averageRating:
      product.rating !== undefined
        ? Number(product.rating)
        : 0,

    totalRatings:
      product.reviews !== undefined
        ? Number(product.reviews)
        : 0,

    isNew: Boolean(product.isNew),
    isFeatured: Boolean(product.isFeatured),

    isDiscontinued: false,

    discount:
      product.discount !== undefined
        ? Number(product.discount)
        : 0,

    discountedPrice:
      product.discountedPrice !== undefined
        ? Number(product.discountedPrice)
        : undefined,

    supportsCustomPrinting:
      Boolean(product.supportsCustomPrinting),

    sku: product.sku,
    upc: product.upc,

    tags: Array.isArray(product.tags)
      ? product.tags
      : [],

    adminNotes: product.adminNotes
  };

  /*
   * Preserve explicitly defined aluminum/container pack pricing
   * without changing its meaning.
   *
   * We are intentionally NOT converting this into a quantity tier
   * yet because the correct commercial rule for quantities such as
   * 75 and 100 still needs to be confirmed.
   */
  if (
    product.packPrice !== undefined &&
    product.packPrice !== null
  ) {
    mappedProduct.packPrice = Number(product.packPrice);
  }

  /*
   * The frontend currently has some product fields that are useful
   * for display but are not part of the backend schema.
   *
   * We keep the important commercial fields above and do not invent
   * backend meanings for fields that have not yet been standardized.
   */

  return mappedProduct;
}

/**
 * Connect to MongoDB.
 */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not configured.'
    );
  }

  console.log('🔌 Connecting to MongoDB...');

  await mongoose.connect(uri);

  console.log('✅ MongoDB connected.');
}

/**
 * Import or update all products.
 */
async function seedProducts() {
  const { categories, products } =
    await fetchFrontendCatalog();

  if (!Array.isArray(categories)) {
    throw new Error(
      'CATEGORIES was not parsed as an array.'
    );
  }

  if (!Array.isArray(products)) {
    throw new Error(
      'PRODUCTS was not parsed as an array.'
    );
  }

  if (products.length === 0) {
    throw new Error(
      'The frontend catalog contains zero products. Import cancelled.'
    );
  }

  const categoriesById = new Map(
    categories.map((category) => [
      category.id,
      category.name
    ])
  );

  console.log(
    `📚 Found ${categories.length} categories.`
  );

  console.log(
    `📦 Found ${products.length} products.`
  );

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const frontendProduct of products) {
    try {
      if (!frontendProduct.id) {
        throw new Error(
          'Product is missing its stable frontend ID.'
        );
      }

      if (!frontendProduct.name) {
        throw new Error(
          'Product is missing its name.'
        );
      }

      if (!frontendProduct.categoryId) {
        throw new Error(
          'Product is missing its categoryId.'
        );
      }

      const mappedProduct = mapProduct(
        frontendProduct,
        categoriesById
      );

      const existingProduct =
        await Product.findOne({
          id: mappedProduct.id
        });

      if (existingProduct) {
        await Product.updateOne(
          { id: mappedProduct.id },
          {
            $set: mappedProduct
          }
        );

        updated += 1;

        console.log(
          `↻ Updated: ${mappedProduct.id} — ${mappedProduct.name}`
        );
      } else {
        await Product.create(mappedProduct);

        created += 1;

        console.log(
          `✓ Created: ${mappedProduct.id} — ${mappedProduct.name}`
        );
      }
    } catch (error) {
      failed += 1;

      console.error(
        `✗ Failed: ${frontendProduct.id || 'unknown'} — ${
          frontendProduct.name || 'Unnamed product'
        }`
      );

      console.error(
        `  ${error.message}`
      );
    }
  }

  console.log('\n========================================');
  console.log('VAULT KHAZANA PRODUCT IMPORT COMPLETE');
  console.log('========================================');
  console.log(`Categories found: ${categories.length}`);
  console.log(`Products found:   ${products.length}`);
  console.log(`Created:          ${created}`);
  console.log(`Updated:          ${updated}`);
  console.log(`Failed:           ${failed}`);
  console.log('========================================');

  if (failed > 0) {
    throw new Error(
      `${failed} product(s) failed during import.`
    );
  }
}

/**
 * Main.
 */
async function main() {
  try {
    await connectDatabase();
    await seedProducts();

    console.log(
      '\n✅ Product catalog successfully synchronized.'
    );
  } catch (error) {
    console.error(
      '\n❌ Product catalog synchronization failed.'
    );

    console.error(error.message);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      '🔌 MongoDB connection closed.'
    );
  }
}

main();