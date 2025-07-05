import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const execAsync = promisify(exec);

export class FlowCLIClient {
  constructor() {
    this.contractAddress = "0x2c1ac42d77578075";
    this.network = "testnet";
    this.signer = "2c1ac42d77578075"; // Use the actual address, not the name
    this.flowDir = path.join(process.cwd(), 'flow', 'accounts'); // Path to flow.json directory
  }

  // Helper method to execute Flow CLI commands
  async executeFlowCommand(command) {
    try {
      console.log(`🔧 Executing Flow CLI command: ${command}`);
      console.log(`📁 Working directory: ${this.flowDir}`);
      
      // Add config file to the command if it's not already specified
      let finalCommand = command;
      if (!command.includes('--config')) {
        finalCommand = `${command} --config-path flow.json`;
      }
      
      const { stdout, stderr } = await execAsync(finalCommand, { 
        cwd: this.flowDir // Run from the flow/accounts directory
      });
      
      if (stderr) {
        console.warn(`⚠️ Flow CLI stderr: ${stderr}`);
      }
      
      console.log(`✅ Flow CLI output: ${stdout}`);
      return stdout;
    } catch (error) {
      console.error(`❌ Flow CLI error: ${error.message}`);
      throw error;
    }
  }

  // Create a new user account (supports optional ethereum address)
  async createUser(userId, ethereumAddress = null) {
    const transactionCode = `
import UserAccountManager2 from ${this.contractAddress}

transaction(userId: String, ethereumAddress: String) {
  prepare(acct: &Account) {
    // Transaction preparation
  }
  
  execute {
    UserAccountManager2.createUser(userId: userId, ethereumAddress: ethereumAddress)
  }
}
    `;

    // Write transaction to temporary file in the flow/accounts directory
    const fs = await import('fs/promises');
    const transactionFile = path.join(this.flowDir, `temp_create_user_${Date.now()}.cdc`);
    await fs.writeFile(transactionFile, transactionCode);

    try {
      // Handle optional ethereum address - use empty string for null, convert to lowercase
      const addressToUse = ethereumAddress ? ethereumAddress.toLowerCase() : "";
      const argsJson = JSON.stringify([
        { type: "String", value: userId },
        { type: "String", value: addressToUse }
      ]).replace(/"/g, '\\"');
      const command = `flow transactions send ${path.basename(transactionFile)} --signer ${this.signer} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      // Clean up temporary file
      await fs.unlink(transactionFile);
      
      console.log("✅ User created successfully via Flow CLI");
      return result;
    } catch (error) {
      // Clean up temporary file even if there's an error
      try {
        await fs.unlink(transactionFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Update Ethereum address for existing user
  async updateEthereumAddress(userId, ethereumAddress) {
    const transactionCode = `
import UserAccountManager2 from ${this.contractAddress}

transaction(userId: String, newAddress: String) {
  prepare(acct: &Account) {
    // Transaction preparation
  }
  
  execute {
    UserAccountManager2.updateEthereumAddress(userId: userId, newAddress: newAddress)
  }
}
    `;

    const fs = await import('fs/promises');
    const transactionFile = path.join(this.flowDir, `temp_update_address_${Date.now()}.cdc`);
    await fs.writeFile(transactionFile, transactionCode);

    try {
      // Convert ethereum address to lowercase for consistency
      const normalizedAddress = ethereumAddress.toLowerCase();
      const argsJson = JSON.stringify([
        { type: "String", value: userId },
        { type: "String", value: normalizedAddress }
      ]).replace(/"/g, '\\"');
      const command = `flow transactions send ${path.basename(transactionFile)} --signer ${this.signer} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(transactionFile);
      
      console.log("✅ Ethereum address updated successfully via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(transactionFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Record match participation
  async recordMatch(userId, matchId) {
    const transactionCode = `
import UserAccountManager2 from ${this.contractAddress}

transaction(userId: String, matchId: String) {
  prepare(acct: &Account) {
    // Transaction preparation
  }
  
  execute {
    UserAccountManager2.recordMatch(userId: userId, matchId: matchId)
  }
}
    `;

    const fs = await import('fs/promises');
    const transactionFile = path.join(this.flowDir, `temp_record_match_${Date.now()}.cdc`);
    await fs.writeFile(transactionFile, transactionCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId },
        { type: "String", value: matchId }
      ]).replace(/"/g, '\\"');
      const command = `flow transactions send ${path.basename(transactionFile)} --signer ${this.signer} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(transactionFile);
      
      console.log("✅ Match recorded successfully via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(transactionFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Record match win
  async recordWin(userId, matchId) {
    const transactionCode = `
import UserAccountManager2 from ${this.contractAddress}

transaction(userId: String, matchId: String) {
  prepare(acct: &Account) {
    // Transaction preparation
  }
  
  execute {
    UserAccountManager2.recordWin(userId: userId, matchId: matchId)
  }
}
    `;

    const fs = await import('fs/promises');
    const transactionFile = path.join(this.flowDir, `temp_record_win_${Date.now()}.cdc`);
    await fs.writeFile(transactionFile, transactionCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId },
        { type: "String", value: matchId }
      ]).replace(/"/g, '\\"');
      const command = `flow transactions send ${path.basename(transactionFile)} --signer ${this.signer} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(transactionFile);
      
      console.log("✅ Win recorded successfully via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(transactionFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Get user statistics
  async getStats(userId) {
    const scriptCode = `
import UserAccountManager2 from ${this.contractAddress}

access(all) fun main(userId: String): UserAccountManager2.UserStats {
  return UserAccountManager2.getStats(userId: userId)
}
    `;

    const fs = await import('fs/promises');
    const scriptFile = path.join(this.flowDir, `temp_get_stats_${Date.now()}.cdc`);
    await fs.writeFile(scriptFile, scriptCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId }
      ]).replace(/"/g, '\\"');
      const command = `flow scripts execute ${path.basename(scriptFile)} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(scriptFile);
      
      console.log("✅ User stats fetched via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(scriptFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Get user's participated matches
  async getMatches(userId) {
    const scriptCode = `
import UserAccountManager2 from ${this.contractAddress}

access(all) fun main(userId: String): [String] {
  return UserAccountManager2.getMatches(userId: userId)
}
    `;

    const fs = await import('fs/promises');
    const scriptFile = path.join(this.flowDir, `temp_get_matches_${Date.now()}.cdc`);
    await fs.writeFile(scriptFile, scriptCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId }
      ]).replace(/"/g, '\\"');
      const command = `flow scripts execute ${path.basename(scriptFile)} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(scriptFile);
      
      console.log("✅ User matches fetched via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(scriptFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Get user's wins
  async getWins(userId) {
    const scriptCode = `
import UserAccountManager2 from ${this.contractAddress}

access(all) fun main(userId: String): [String] {
  return UserAccountManager2.getWins(userId: userId)
}
    `;

    const fs = await import('fs/promises');
    const scriptFile = path.join(this.flowDir, `temp_get_wins_${Date.now()}.cdc`);
    await fs.writeFile(scriptFile, scriptCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId }
      ]).replace(/"/g, '\\"');
      const command = `flow scripts execute ${path.basename(scriptFile)} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(scriptFile);
      
      console.log("✅ User wins fetched via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(scriptFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Get user's ethereum address
  async getEthereumAddress(userId) {
    const scriptCode = `
import UserAccountManager2 from ${this.contractAddress}

access(all) fun main(userId: String): String? {
  return UserAccountManager2.getEthereumAddress(userId: userId)
}
    `;

    const fs = await import('fs/promises');
    const scriptFile = path.join(this.flowDir, `temp_get_address_${Date.now()}.cdc`);
    await fs.writeFile(scriptFile, scriptCode);

    try {
      const argsJson = JSON.stringify([
        { type: "String", value: userId }
      ]).replace(/"/g, '\\"');
      const command = `flow scripts execute ${path.basename(scriptFile)} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(scriptFile);
      
      console.log("✅ User ethereum address fetched via Flow CLI");
      return result;
    } catch (error) {
      try {
        await fs.unlink(scriptFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Check if user exists (by trying to get their ethereum address)
  async userExists(userId) {
    try {
      await this.getEthereumAddress(userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get user ID by ethereum address
  async getUserIdByEthereumAddress(ethereumAddress) {
    const scriptCode = `
import UserAccountManager2 from ${this.contractAddress}

access(all) fun main(ethereumAddress: String): String {
  return UserAccountManager2.getUserIdByAddress(ethereumAddress: ethereumAddress)
}
    `;

    const fs = await import('fs/promises');
    const scriptFile = path.join(this.flowDir, `temp_get_userid_${Date.now()}.cdc`);
    await fs.writeFile(scriptFile, scriptCode);

    try {
      // Convert ethereum address to lowercase for lookup
      const normalizedAddress = ethereumAddress.toLowerCase();
      const argsJson = JSON.stringify([
        { type: "String", value: normalizedAddress }
      ]).replace(/"/g, '\\"');
      const command = `flow scripts execute ${path.basename(scriptFile)} --network ${this.network} --args-json "${argsJson}"`;
      
      const result = await this.executeFlowCommand(command);
      
      await fs.unlink(scriptFile);
      
      console.log("✅ User ID by ethereum address fetched via Flow CLI");
      return result.trim();
    } catch (error) {
      try {
        await fs.unlink(scriptFile);
      } catch (cleanupError) {
        console.warn("⚠️ Could not clean up temporary file:", cleanupError.message);
      }
      throw error;
    }
  }

  // Check if Flow CLI is installed
  async checkFlowCLI() {
    try {
      await this.executeFlowCommand('flow version');
      console.log("✅ Flow CLI is installed and working");
      return true;
    } catch (error) {
      console.error("❌ Flow CLI is not installed or not in PATH");
      console.error("Please install Flow CLI from: https://developers.flow.com/tools/flow-cli");
      return false;
    }
  }

  // Check account configuration
  async checkAccount() {
    try {
      const result = await this.executeFlowCommand(`flow accounts get ${this.signer} --network ${this.network}`);
      console.log("✅ Flow account configuration is valid");
      return true;
    } catch (error) {
      console.error("❌ Flow account configuration error:", error.message);
      console.error("Make sure you have configured your Flow account with 'flow accounts create'");
      return false;
    }
  }
} 