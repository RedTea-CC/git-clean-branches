import { execSync } from "node:child_process";
import inquirer from "inquirer";
import process from "node:process";

function insideGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function fetchPrune() {
  execSync("git fetch --prune --all", { stdio: "inherit" });
}

function listStaleBranches() {
  // git branch -vv 输出转成数组
  const output = execSync("git branch -vv", { encoding: "utf8" });
  return output
    .split("\n")
    .filter((line) => line.includes(": gone]"))
    .map(
      (line) =>
        line
          .replace("*", "") // 去掉当前分支标记
          .trim()
          .split(/\s+/)[0] // 取分支名
    )
    .filter(Boolean);
}

async function promptBranches(branches) {
  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      // Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed
      message: "选择要删除的本地分支（空格勾选，a 全选，i 反选，回车确认）",
      choices: branches,
      pageSize: 20,
    },
  ]);
  return selected;
}

function deleteBranch(branch) {
  execSync(`git branch -D ${branch}`, { stdio: "inherit" });
}

export async function run() {
  if (!insideGitRepo()) {
    console.error("✖ 当前目录不是 Git 仓库");
    process.exit(1);
  }

  console.log("🔄 正在同步远程并清理引用...");
  fetchPrune();

  const stale = listStaleBranches();
  if (stale.length === 0) {
    console.log("✅ 没有发现需要清理的本地分支");
    return;
  }

  const choices = await promptBranches(stale);
  if (choices.length === 0) {
    console.log("👋 已取消，未删除任何分支");
    return;
  }

  console.log(`🗑 删除 ${choices.length} 个分支...`);
  choices.forEach(deleteBranch);
  console.log("✨ 完成");
}
