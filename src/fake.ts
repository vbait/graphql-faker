import { allFakers, faker } from '@faker-js/faker';

// Matches an escaped literal ([...], emitted verbatim without the brackets)
// or one of the supported moment-style date tokens.
const DATE_TOKENS = /\[([^\]]*)]|YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g;

function pad(value: number): string {
  return value < 10 ? '0' + value : String(value);
}

// Formats a Date using the moment-style tokens documented for the `date`
// fake types (YYYY, MM, DD, HH, mm, ss, ...). Text wrapped in `[]` is emitted
// literally. When no format is given the ISO-8601 representation is returned,
// matching the previous `moment` default.
function formatDate(date: Date, format?: string): string {
  if (format == null) {
    return date.toISOString();
  }
  return format.replace(DATE_TOKENS, (token, escaped?: string) => {
    if (escaped !== undefined) {
      return escaped;
    }
    switch (token) {
      case 'YYYY':
        return String(date.getFullYear());
      case 'YY':
        return pad(date.getFullYear() % 100);
      case 'MM':
        return pad(date.getMonth() + 1);
      case 'M':
        return String(date.getMonth() + 1);
      case 'DD':
        return pad(date.getDate());
      case 'D':
        return String(date.getDate());
      case 'HH':
        return pad(date.getHours());
      case 'H':
        return String(date.getHours());
      case 'mm':
        return pad(date.getMinutes());
      case 'm':
        return String(date.getMinutes());
      case 'ss':
        return pad(date.getSeconds());
      case 's':
        return String(date.getSeconds());
      default:
        return token;
    }
  });
}

export function getRandomInt(min: number, max: number) {
  return faker.number.int({ min, max });
}

export function getRandomItem<T>(array: ReadonlyArray<T>): T {
  return array[getRandomInt(0, array.length - 1)];
}

export const stdScalarFakers = {
  Int: () => faker.number.int({ min: 0, max: 99999 }),
  Float: () => faker.number.float({ min: 0, max: 99999, multipleOf: 0.01 }),
  String: () => 'string',
  Boolean: () => faker.datatype.boolean(),
  ID: () => toBase64(faker.number.int({ max: 9999999999 }).toString()),
};

function toBase64(str: string) {
  return Buffer.from(str).toString('base64');
}

function fakeFunctions(fakerInstance: typeof faker) {
  return {
    // Address section
    zipCode: () => fakerInstance.location.zipCode(),
    city: () => fakerInstance.location.city(),
    // Skipped: faker.address.cityPrefix
    // Skipped: faker.address.citySuffix
    streetName: () => fakerInstance.location.street(),
    streetAddress: {
      args: ['useFullAddress'],
      func: (useFullAddress) =>
        fakerInstance.location.streetAddress(useFullAddress),
    },
    // Skipped: faker.address.streetSuffix
    // Skipped: faker.address.streetPrefix
    secondaryAddress: () => fakerInstance.location.secondaryAddress(),
    county: () => fakerInstance.location.county(),
    country: () => fakerInstance.location.country(),
    countryCode: () => fakerInstance.location.countryCode(),
    state: () => fakerInstance.location.state(),
    stateAbbr: () => fakerInstance.location.state({ abbreviated: true }),
    latitude: () => fakerInstance.location.latitude(),
    longitude: () => fakerInstance.location.longitude(),

    // Commerce section
    colorName: () => fakerInstance.color.human(),
    productCategory: () => fakerInstance.commerce.department(),
    productName: () => fakerInstance.commerce.productName(),
    money: {
      args: ['minMoney', 'maxMoney', 'decimalPlaces'],
      func: (min, max, dec) => fakerInstance.commerce.price({ min, max, dec }),
    },
    // Skipped: faker.commerce.productAdjective
    productMaterial: () => fakerInstance.commerce.productMaterial(),
    product: () => fakerInstance.commerce.product(),

    // Company section
    // Skipped: faker.company.companySuffixes
    companyName: () => fakerInstance.company.name(),
    // Skipped: faker.company.companySuffix
    companyCatchPhrase: () => fakerInstance.company.catchPhrase(),
    companyBs: () => fakerInstance.company.buzzPhrase(),
    // Skipped: faker.company.catchPhraseAdjective
    // Skipped: faker.company.catchPhraseDescriptor
    // Skipped: faker.company.catchPhraseNoun
    // Skipped: faker.company.companyBsAdjective
    // Skipped: faker.company.companyBsBuzz
    // Skipped: faker.company.companyBsNoun

    // Database section
    dbColumn: () => fakerInstance.database.column(),
    dbType: () => fakerInstance.database.type(),
    dbCollation: () => fakerInstance.database.collation(),
    dbEngine: () => fakerInstance.database.engine(),

    // Date section
    date: {
      args: ['dateFormat', 'dateFrom', 'dateTo'],
      func: (dateFormat, dateFrom, dateTo) =>
        formatDate(
          fakerInstance.date.between({ from: dateFrom, to: dateTo }),
          dateFormat,
        ),
    },
    pastDate: {
      args: ['dateFormat'],
      func: (dateFormat) => formatDate(fakerInstance.date.past(), dateFormat),
    },
    futureDate: {
      args: ['dateFormat'],
      func: (dateFormat) => formatDate(fakerInstance.date.future(), dateFormat),
    },
    recentDate: {
      args: ['dateFormat'],
      func: (dateFormat) => formatDate(fakerInstance.date.recent(), dateFormat),
    },

    // Finance section
    financeAccountName: () => fakerInstance.finance.accountName(),
    //TODO: investigate finance.mask
    financeTransactionType: () => fakerInstance.finance.transactionType(),
    currencyCode: () => fakerInstance.finance.currencyCode(),
    currencyName: () => fakerInstance.finance.currencyName(),
    currencySymbol: () => fakerInstance.finance.currencySymbol(),
    bitcoinAddress: () => fakerInstance.finance.bitcoinAddress(),
    internationalBankAccountNumber: () => fakerInstance.finance.iban(),
    bankIdentifierCode: () => fakerInstance.finance.bic(),

    // Hacker section
    hackerAbbreviation: () => fakerInstance.hacker.abbreviation(),
    hackerPhrase: () => fakerInstance.hacker.phrase(),

    // Image section
    imageUrl: {
      args: ['imageSize', 'imageKeywords', 'randomizeImageUrl'],
      func: (size, keywords, randomize) => {
        let url = 'https://source.unsplash.com/random/';

        if (size != null) {
          url += `${size.width}x${size.height}/`;
        }

        if (keywords != null && keywords.length > 0) {
          url += '?' + keywords.join(',');
        }

        if (randomize === true) {
          url += '#' + fakerInstance.number.int();
        }

        return url;
      },
    },

    // Internet section
    avatarUrl: () => fakerInstance.image.avatar(),
    email: {
      args: ['emailProvider'],
      func: (provider) => fakerInstance.internet.email({ provider }),
    },
    url: () => fakerInstance.internet.url(),
    domainName: () => fakerInstance.internet.domainName(),
    ipv4Address: () => fakerInstance.internet.ip(),
    ipv6Address: () => fakerInstance.internet.ipv6(),
    userAgent: () => fakerInstance.internet.userAgent(),
    colorHex: {
      args: ['baseColor'],
      // Mix a random value with the requested base per channel (average),
      // matching the documented technique. `red255/green255/blue255` default
      // to 0 -> a fully random (dark-biased) color.
      func: (baseColor) => {
        const { red255 = 0, green255 = 0, blue255 = 0 } = baseColor ?? {};
        const channel = (base: number) => {
          const value = Math.floor(
            (fakerInstance.number.int({ min: 0, max: 255 }) + base) / 2,
          );
          return value.toString(16).padStart(2, '0');
        };
        return '#' + channel(red255) + channel(green255) + channel(blue255);
      },
    },
    macAddress: () => fakerInstance.internet.mac(),
    password: {
      args: ['passwordLength'],
      func: (len) => fakerInstance.internet.password(len),
    },

    // Lorem section
    lorem: {
      args: ['loremSize'],
      func: (size) => fakerInstance.lorem[size || 'paragraphs'](),
    },

    // Name section
    firstName: () => fakerInstance.person.firstName(),
    lastName: () => fakerInstance.person.lastName(),
    fullName: () => fakerInstance.person.fullName(),
    jobTitle: () => fakerInstance.person.jobTitle(),

    // Phone section
    phoneNumber: () => fakerInstance.phone.number(),
    // Skipped: faker.phone.phoneNumberFormat
    // Skipped: faker.phone.phoneFormats

    // Random section
    number: {
      args: ['minNumber', 'maxNumber', 'precisionNumber'],
      func: (min, max, precision) => {
        try {
          return fakerInstance.number.float({
            min,
            max,
            multipleOf: precision,
          });
        } catch {
          // `multipleOf` throws when no multiple fits [min, max]; the old
          // `precision` option never did, so fall back to an unrounded value.
          return fakerInstance.number.float({ min, max });
        }
      },
    },
    uuid: () => fakerInstance.string.uuid(),
    word: () => fakerInstance.lorem.word(),
    words: () => fakerInstance.lorem.words(),
    locale: () => fakerInstance.helpers.objectKey(allFakers),

    // System section
    // Skipped: faker.system.fileName
    // TODO: Add ext
    filename: () => fakerInstance.system.commonFileName(),
    mimeType: () => fakerInstance.system.mimeType(),
    // Skipped: faker.system.fileType
    // Skipped: faker.system.commonFileType
    // Skipped: faker.system.commonFileExt
    fileExtension: () => fakerInstance.system.fileExt(),
    semver: () => fakerInstance.system.semver(),
  };
}

export function fakeValue(type, options?, locale?) {
  const fakerInstance = locale != null ? allFakers[locale] : faker;
  const fakeGenerator = fakeFunctions(fakerInstance)[type];

  if (typeof fakeGenerator === 'function') {
    return fakeGenerator();
  }
  const callArgs = fakeGenerator.args.map((name) => options[name]);
  return fakeGenerator.func(...callArgs);
}
