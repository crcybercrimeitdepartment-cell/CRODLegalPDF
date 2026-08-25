import glob, os, re

files = glob.glob(r'd:\PRINCE CRCCF\Final Projects\CR_OD_Legal_PDF\src\page\ConvertPDF\PDFto*Page.jsx')

# 1. Update backgrounds
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace all backgrounds in the top wrapper with bg-transparent
    # Example: <div className="flex-1 flex flex-col w-full bg-[#f2f6ee] relative z-20 min-h-screen">
    # We will just replace 'bg-[#[a-fA-F0-9]+]' when it occurs near 'relative z-20 min-h-screen'
    content = re.sub(r'bg-\[[^\]]+\]\s+(relative z-20 min-h-screen)', r'bg-transparent \1', content)
    
    # Alternatively, some might just be bg-slate-50
    content = re.sub(r'bg-slate-50\s+(relative z-20 min-h-screen)', r'bg-transparent \1', content)

    # Some might use bg-[#...] without min-h-screen? Just in case, let's just do:
    content = re.sub(r'className="flex-1 flex flex-col w-full bg-\[[^\]]+\]', 'className="flex-1 flex flex-col w-full bg-transparent', content)
    content = re.sub(r'className="flex-1 flex flex-col w-full bg-[a-z0-9\-]+', 'className="flex-1 flex flex-col w-full bg-transparent', content)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Updated backgrounds for all 38 files.')

# 2. Update ConvertPDF.jsx to remove the extra header and back button
conv_path = r'd:\PRINCE CRCCF\Final Projects\CR_OD_Legal_PDF\src\page\ConvertPDF\ConvertPDF.jsx'
with open(conv_path, 'r', encoding='utf-8') as f:
    conv_content = f.read()

# We need to replace the big return block with just the component
new_block = '''  if (selectedTool) {
    const Component = COMPONENT_MAP[selectedTool.id];
    if (Component) {
      return (
        <div className="flex-1 flex flex-col w-full relative z-10">
          <Component tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />
        </div>
      );
    }
    return <ToolWorkspace tool={selectedTool} onBack={() => { setSelectedTool(null); const parentHash = window.location.hash.split('/')[0]; window.history.pushState({ page: parentHash.replace('#', '') }, '', parentHash); window.scrollTo(0, 0); }} />;
  }'''

# Using regex to replace the whole block because whitespace might be different
conv_content = re.sub(r'if \(selectedTool\) \{.*?return <ToolWorkspace tool=\{selectedTool\}', 
    new_block.replace('return <ToolWorkspace tool={selectedTool}', 'return <ToolWorkspace tool={selectedTool}'), 
    conv_content, flags=re.DOTALL)

with open(conv_path, 'w', encoding='utf-8') as f:
    f.write(conv_content)

print('Patched ConvertPDF.jsx successfully.')
