const path = require("node:path");
const { expect, test } = require("@playwright/test");

const fixturePath = path.join(
  __dirname,
  "..",
  "fixtures",
  "import-preview.json",
);

test("shows a server-side import review before commit", async ({ page }) => {
  await page.goto("/import");
  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByText("Review before importing")).toBeVisible();
  await expect(page.getByText("Will create")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeEnabled();
});
