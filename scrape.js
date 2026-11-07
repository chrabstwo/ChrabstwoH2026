const puppeteer = require('puppeteer');
const axios = require('axios');

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.goto('https://mta4life.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        const fetched = await page.evaluate(() => {
            const results = {};
            const items = document.querySelectorAll('.mtaCommodityPrices > div, .mtaCommodityPrice, div[class*="Commodity"]');
            
            items.forEach(el => {
                const name = el.querySelector('[class*="name"], .mtaCommodityPrice__name')?.innerText.trim();
                const amount = el.querySelector('[class*="amount"], .mtaCommodityPrice__amount')?.innerText.trim();
                const unit = el.querySelector('[class*="unit"], .mtaCommodityPrice__unit')?.innerText.trim();

                if (name && amount) {
                    const currentVal = parseFloat(amount.replace(',', '.'));
                    if (!isNaN(currentVal)) {
                        results[name] = {
                            value: currentVal,
                            unit: unit || 'kg',
                            raw: `${amount} ${unit || ''}`.trim()
                        };
                    }
                }
            });
            return results;
        });

        await browser.close();

        if (Object.keys(fetched).length > 0) {
            // Wysyłamy pobrane ceny do Cloudflare Workera
            const workerUrl = 'https://patient-star-01ba.frebcraft17.workers.dev/';
            await axios.post(workerUrl, fetched);
            console.log('Ceny zostały pomyślnie zaktualizowane przez GitHub Actions!');
        } else {
            console.error('Nie znaleziono cen na stronie.');
            process.exit(1);
        }
    } catch (error) {
        await browser.close();
        console.error('Błąd:', error.message);
        process.exit(1);
    }
}

run();
