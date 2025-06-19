#!/usr/bin/env python3
"""
Evaluate Property Workflow Runner for Onyx

This script runs the OpenManus evaluate property workflow by:
1. Creating a unique folder in the database directory
2. Copying the config file to the input directory
3. Copying the template file to the input directory
4. Updating the config with specific input/output directories
5. Running OpenManus with the modified config
6. Finding a suitable markdown file to display

All paths are dynamically generated based on a unique identifier.
"""

import os
import sys
import shutil
import subprocess
import datetime
import uuid
from pathlib import Path
import re
import argparse

# Hardcoded paths for evaluate property workflow
OPENMANUS_PATH = Path("/home/adrian_user/OpenManus")
VENV_PATH = OPENMANUS_PATH / ".venv"
PYTHON_EXECUTABLE = VENV_PATH / "bin" / "python"
RUN_FLOW_SCRIPT = OPENMANUS_PATH / "run_flow.py"

# Source config and template file
SOURCE_CONFIG_PATH = Path("/home/adrian_user/onyx/config_files_openmanus/config_evaluate_property.toml")
TEMPLATE_PATH = Path("/home/adrian_user/onyx/templates_files_openmanus/IC_instruction.md")

# Database directory for input/output
DATABASE_DIR = Path("/home/adrian_user/database")
WORKSPACE_ROOT = OPENMANUS_PATH / "workspace/current_workspaces"

def create_run_directories(run_id):
    """
    Create input/workspace directories based on the provided run_id.
    Returns dict with unique_id, input_dir, workspace_dir, and configs_dir.
    """
    if not run_id:
        print("Error: run_id cannot be empty. Generating a fallback UUID.")
        run_id = uuid.uuid4().hex[:12] # Fallback if empty run_id is passed

    base_dir = DATABASE_DIR / run_id
    input_dir = base_dir / "input"
    workspace_dir = base_dir / "workspace_dir"
    configs_dir = base_dir / 'configs'
    
    # Create directories
    input_dir.mkdir(parents=True, exist_ok=True)
    workspace_dir.mkdir(parents=True, exist_ok=True)
    configs_dir.mkdir(parents=True, exist_ok=True)
    
    return {
        "unique_id": run_id, # Use the provided run_id as unique_id
        "input_dir": input_dir,
        "workspace_dir": workspace_dir,
        "configs_dir": configs_dir,
        "base_dir": base_dir
    }
    
def copy_and_modify_config(dirs):
    """
    Copy the config file to the configs directory and modify the paths
    Returns the path to the modified config file
    """
    input_dir = dirs["input_dir"]
    workspace_dir = dirs["workspace_dir"]
    configs_dir = dirs["configs_dir"]
    
    # Copy the config file
    modified_config_path = configs_dir / "config_evaluate_property.toml"
    shutil.copy2(SOURCE_CONFIG_PATH, modified_config_path)
    print(f"Copied config from {SOURCE_CONFIG_PATH} to {modified_config_path}")
    
    # Copy the template file to the input directory - specific to evaluate property workflow
    if TEMPLATE_PATH.exists():
        template_dest = input_dir / TEMPLATE_PATH.name
        shutil.copy2(TEMPLATE_PATH, template_dest)
        print(f"Copied template from {TEMPLATE_PATH} to {template_dest}")
    else:
        print(f"Warning: Template file not found: {TEMPLATE_PATH}")
    
    # Read the config content
    with open(modified_config_path, 'r') as f:
        content = f.read()
    
    # Replace the paths in the [io] section
    input_pattern = r'(input_dir\s*=\s*)"[^"]*"'
    output_pattern = r'(output_dir\s*=\s*)"[^"]*"'
    workspace_pattern = r'(workspace_root\s*=\s*)"[^"]*"'
    
    content = re.sub(input_pattern, f'\\1"{input_dir.as_posix()}"', content)
    content = re.sub(output_pattern, f'\\1"{workspace_dir.as_posix()}"', content)
    content = re.sub(workspace_pattern, f'\\1"{workspace_dir.as_posix()}"', content)
    
    # Check for query in environment variable and append to config if exists
    user_query_from_env = os.environ.get('OPENMANUS_QUERY')
    if user_query_from_env and user_query_from_env.strip(): # Ensure query is not None and not just whitespace
        print(f"Found user_query in environment: {user_query_from_env[:50]}{'...' if len(user_query_from_env) > 50 else ''}")
        
        # Escape for TOML: backslashes, double quotes, and newlines.
        escaped_user_query = user_query_from_env.replace('\\', '\\\\')  # Escape backslashes first
        escaped_user_query = escaped_user_query.replace('"', '\\"')  # Escape double quotes
        escaped_user_query = escaped_user_query.replace('\n', '\\n') # Escape newlines
        escaped_user_query = escaped_user_query.replace('\r', '\\r') # Escape carriage returns
        escaped_user_query = escaped_user_query.replace('\t', '\\t') # Escape tabs

        # Ensure [runflow] section exists
        if '[runflow]' not in content:
            content += '\n\n[runflow]\n'
        
        # Prepare the user_query line to be added
        user_query_line = f'user_query = "{escaped_user_query}"\n'

        # Find the [runflow] section and append the user_query_line at the end of it
        runflow_header_match = re.search(r"^\s*\[runflow\]", content, re.MULTILINE)
        if runflow_header_match:
            # Find the end of the [runflow] section
            # This is either the start of the next section or end of file
            section_start_pos = runflow_header_match.end()
            next_section_match = re.search(r"^\s*\[[a-zA-Z0-9_.-]+\]", content[section_start_pos:], re.MULTILINE)
            
            if next_section_match:
                # Insert before the next section header
                insertion_point = section_start_pos + next_section_match.start()
                content = content[:insertion_point] + user_query_line + content[insertion_point:]
            else:
                # Append to the end of the file (if [runflow] is the last section)
                content = content.rstrip() + '\n' + user_query_line
        else:
            # This case should ideally not be reached if [runflow] is added above,
            # but as a fallback, append to the end of the content.
            print("Warning: [runflow] section not found for adding user_query, appending to end of file.")
            content = content.rstrip() + '\n\n[runflow]\n' + user_query_line
    else:
        print("No user_query provided in environment or query is empty.")
    
    # Write the modified content back
    with open(modified_config_path, 'w') as f:
        f.write(content)
    
    # Verify the config was written correctly
    if os.path.exists(modified_config_path):
        print(f"Config file saved successfully: {modified_config_path}")
        file_size = os.path.getsize(modified_config_path)
        print(f"Config file size: {file_size} bytes")
        
        # Show a preview of the modified config
        with open(modified_config_path, 'r') as f:
            preview = f.read(1000)
        print(f"Config preview:\n{'=' * 40}\n{preview[:500]}\n{'...' if len(preview) > 500 else ''}\n{'=' * 40}")
    else:
        print(f"ERROR: Config file not found after writing: {modified_config_path}")
    
    return modified_config_path

def run_openmanus(config_path, verbose=True, timeout=None):
    """
    Run OpenManus with the specified config file
    
    Args:
        config_path: Path to the modified TOML configuration file
        verbose: Whether to print output in real-time
        timeout: Maximum time in seconds to wait for process completion
    
    Returns:
        Return code from subprocess
    """
    # Extract input and workspace directories from config path
    input_dir = Path(config_path).parent
    workspace_dir = input_dir.parent / "workspace_dir"
    
    if verbose:
        print(f"Running evaluate property workflow:")
        print(f"  Config: {config_path}")
        print(f"  Input directory: {input_dir}")
        print(f"  Workspace directory: {workspace_dir}")
    
    # Set up environment with OPENMANUS_CONFIG_PATH
    env = os.environ.copy()
    env["OPENMANUS_CONFIG_PATH"] = str(config_path)
    
    # Verify that the OpenManus files exist
    if not PYTHON_EXECUTABLE.exists():
        raise FileNotFoundError(f"Python executable not found: {PYTHON_EXECUTABLE}")
    if not RUN_FLOW_SCRIPT.exists():
        raise FileNotFoundError(f"run_flow.py script not found: {RUN_FLOW_SCRIPT}")
    
    # Run OpenManus
    try:
        start_time = datetime.datetime.now()
        print(f"\nStarting OpenManus execution at {start_time.strftime('%H:%M:%S')}...")
        
        # Use Popen for all modes to support timeout
        process = subprocess.Popen(
            [str(PYTHON_EXECUTABLE), str(RUN_FLOW_SCRIPT)],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
        
        stdout_lines = []
        stderr_lines = []
        
        # Set up non-blocking reading from stdout and stderr
        import select
        import time
        import signal
        
        # Function to handle timeouts
        def handle_timeout(signum, frame):
            print(f"\nProcess timed out after {timeout} seconds")
            process.terminate()
            # Give it a chance to terminate gracefully
            time.sleep(2)
            if process.poll() is None:
                print("Process did not terminate, forcing kill...")
                process.kill()
            raise TimeoutError(f"Process timed out after {timeout} seconds")
        
        # Set alarm if timeout is specified
        if timeout:
            signal.signal(signal.SIGALRM, handle_timeout)
            signal.alarm(timeout)
        
        # Use select to avoid blocking
        while process.poll() is None:
            # Check if process has anything to read, timeout after 0.1 seconds
            readable, _, _ = select.select([process.stdout, process.stderr], [], [], 0.1)
            
            for stream in readable:
                line = stream.readline()
                if not line:
                    continue
                    
                if stream == process.stdout:
                    if verbose:
                        print(f"STDOUT: {line.rstrip()}")
                    stdout_lines.append(line)
                else:  # stream == process.stderr
                    if verbose:
                        print(f"STDERR: {line.rstrip()}")
                    stderr_lines.append(line)
            
            # Brief pause to avoid CPU spinning
            time.sleep(0.01)
        
        # Cancel alarm if process completed before timeout
        if timeout:
            signal.alarm(0)
        
        # Read any remaining output after process completion
        for line in process.stdout:
            if verbose:
                print(f"STDOUT: {line.rstrip()}")
            stdout_lines.append(line)
            
        for line in process.stderr:
            if verbose:
                print(f"STDERR: {line.rstrip()}")
            stderr_lines.append(line)
        
        return_code = process.returncode
        stdout = ''.join(stdout_lines)
        stderr = ''.join(stderr_lines)
        
        end_time = datetime.datetime.now()
        duration = end_time - start_time
        print(f"\nProcess completed in {duration.total_seconds():.2f} seconds with return code: {return_code}")
        
        if return_code != 0 and not verbose:
            print(f"\nError running OpenManus. Return code: {return_code}")
            if stderr:
                print("\n--- STDERR ---")
                print(stderr)
        
        # We've removed copying to output directory as per requirements
        
        return return_code, stdout, stderr
        
    except Exception as e:
        print(f"Error running OpenManus: {e}")
        return 1, "", str(e)

def find_display_file(workspace_dir):
    """
    Find a suitable markdown file to display from the workspace directory
    Returns the path to the file and its content
    """
    # Look for markdown files in the workspace directory and its subdirectories
    markdown_files = list(workspace_dir.glob("**/*.md"))
    
    if not markdown_files:
        print("No markdown files found in workspace directory or its subdirectories")
        return None, "No markdown files found in workspace directory."
    
    print(f"Found {len(markdown_files)} markdown files in the workspace directory")
    for md_file in markdown_files:
        print(f"  - {md_file.relative_to(workspace_dir)}")
    
    # Priority order for files to display for evaluate property workflow
    priority_filenames = [
        "IC_report.md",        # IC report - highest priority for evaluate property
        "results_overview.md", # Generic results overview
        "summary.md",          # Generic summary
        "report.md",           # Generic report
        "output.md",           # Generic output
    ]
    
    # First try to find exact filename matches from the priority list
    for filename in priority_filenames:
        for file in markdown_files:
            if file.name.lower() == filename.lower():
                try:
                    print(f"Found priority file: {file.name}")
                    content = file.read_text()
                    return file, content
                except Exception as e:
                    print(f"Error reading {file}: {e}")
                    continue
    
    # If no exact match found, try partial matches
    for priority in priority_filenames:
        for file in markdown_files:
            if priority.lower().split('.')[0] in file.name.lower():
                try:
                    print(f"Found partial match: {file.name}")
                    content = file.read_text()
                    return file, content
                except Exception as e:
                    print(f"Error reading {file}: {e}")
                    continue
    
    # If no priority file found, return the first markdown file
    try:
        print(f"Using first available markdown file: {markdown_files[0].name}")
        content = markdown_files[0].read_text()
        return markdown_files[0], content
    except Exception as e:
        print(f"Error reading first markdown file: {e}")
        return markdown_files[0], f"Error reading file: {e}"

def main(run_id_arg=None):
    """Main entry point"""
    current_run_id = run_id_arg
    if not current_run_id:
        # Fallback if not passed as arg (e.g. direct script execution for testing)
        current_run_id = uuid.uuid4().hex[:12]
        print(f"No run_id argument provided, generated one: {current_run_id}")

    try:
        # Get unique run ID and create directories
        dirs = create_run_directories(current_run_id)
        
        print(f"Run ID: {dirs['unique_id']}")
        print(f"Created run directories:")
        print(f"  Base directory: {dirs['base_dir']}")
        print(f"  Input directory: {dirs['input_dir']}")
        print(f"  Workspace directory: {dirs['workspace_dir']}")
        print(f"  Configs directory: {dirs['configs_dir']}")
        
        # Copy and modify the config file
        modified_config_path = copy_and_modify_config(dirs)
        
        # Run OpenManus (with a timeout of 600 seconds = 10 minutes)
        return_code, stdout, stderr = run_openmanus(modified_config_path, timeout=600)
        
        # Check for any files in the workspace directory
        print(f"\nChecking for files in: {dirs['workspace_dir']}")
        workspace_files = list(dirs['workspace_dir'].glob("*"))
        
        display_file = None
        content = ""
        
        if workspace_files:
            print("\nWorkspace files found:")
            for file in workspace_files:
                print(f"  - {file.name}")
            
            # Find a suitable markdown file to display
            display_file, content = find_display_file(dirs['workspace_dir'])
            
            if display_file:
                print(f"\nDisplay file selected: {display_file.name}")
                return return_code, stdout, stderr, dirs, display_file, content
            else:
                # This is a real error case - output files exist, but none are suitable for display
                print(f"\nWorkflow execution failed - no display file available among outputs.")
                # Attempt to create a final fallback error report here as well
                try:
                    error_report_content = f"# Workflow Critical Error\n\nWorkspace files were created, but no suitable display file (e.g., .md) was found.\nSTDOUT:\n```\n{stdout}\n```\nSTDERR:\n```\n{stderr}\n```"
                    error_report_path = dirs['workspace_dir'] / "critical_error_report.md"
                    with open(error_report_path, 'w') as f:
                        f.write(error_report_content)
                    return 0, stdout, stderr, dirs, error_report_path, error_report_content # Return 0 to UI
                except Exception as final_fallback_err:
                    print(f"Critical error creating final fallback report: {final_fallback_err}")
                    return 1, stdout, stderr, dirs, None, "No display file found, and fallback report failed."
        else:
            # This handles the case where the script ran but produced NO output files.
            print("\nWorkflow execution finished, but no workspace files were generated.")
            try:
                error_report_content = f"# Workflow Finished Without Output\n\nThe workflow script completed without errors, but no workspace files were generated in the workspace directory.\n\nSTDOUT:\n```\n{stdout}\n```\n\nSTDERR:\n```\n{stderr}\n```"
                fallback_file_path = dirs['workspace_dir'] / "no_output_report.md"
                with open(fallback_file_path, 'w') as f:
                    f.write(error_report_content)
                return 0, stdout, stderr, dirs, fallback_file_path, error_report_content
            except Exception as fallback_err:
                print(f"Critical error creating 'no output' fallback report: {fallback_err}")
                return 1, stdout, stderr, dirs, None, "Workflow finished with no output, and fallback report failed."
            
    except Exception as e:
        print(f"Error: {e}")
        # Create a fallback markdown file for UI to display
        try:
            # Ensure dirs is initialized even if create_run_directories failed or wasn't called
            if 'dirs' not in locals() or not dirs:
                dirs = create_run_directories(current_run_id) # Attempt to create/use run_id based dirs
            fallback_file_path = dirs['workspace_dir'] / "script_error_report.md"
            error_content = f"# Workflow Script Error Report\n\nThe workflow script encountered an unhandled error:\n\n```\n{str(e)}\n```\n\nPlease check the server logs for more details."
            with open(fallback_file_path, 'w') as f:
                f.write(error_content)
            # Return 0 to UI, with the error report as content
            return 0, "", str(e), dirs, fallback_file_path, error_content
        except Exception as inner_e:
            print(f"Critical error creating script error fallback file: {inner_e}")
            # If even creating the fallback fails, return 1 and a generic message
            return 1, "", str(e), None, None, "Critical script error and unable to create fallback report."

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run OpenManus evaluate property workflow.')
    parser.add_argument('--run_id', type=str, help='The unique run ID for this workflow execution.')
    args = parser.parse_args()

    # When running directly, just return the exit code
    exit_code, _, _, _, _, _ = main(run_id_arg=args.run_id)
    sys.exit(exit_code)
else:
    # When imported, the main function returns all the information
    # This is useful for the Onyx integration
    pass
