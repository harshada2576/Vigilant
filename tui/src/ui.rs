use ratatui::{
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Wrap, List, ListItem},
    Frame,
};
use std::sync::{Arc, Mutex};
use crate::app::AppState;

pub fn draw_ui(f: &mut Frame, state_mutex: &Arc<Mutex<AppState>>) {
    let size = f.size();
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Status bar
            Constraint::Min(3),    // Content area
            Constraint::Length(3), // Input area
        ])
        .split(size);

    let state = state_mutex.lock().unwrap();

    // 1. Status Bar
    let strict_status = if state.strict_mode { "ENABLED" } else { "DISABLED" };
    let status_style = if state.strict_mode {
        Style::default().fg(Color::LightGreen).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::LightRed)
    };
    
    let title_line = Line::from(vec![
        Span::raw(" CipherLink | User: "),
        Span::styled(&state.user_id, Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
        Span::raw(" | Server: "),
        Span::styled(&state.homeserver_url, Style::default().fg(Color::Blue)),
        Span::raw(" | Strict E2EE: "),
        Span::styled(strict_status, status_style),
    ]);

    let title_bar = Paragraph::new(title_line)
        .block(Block::default().borders(Borders::ALL).title("Status"))
        .style(Style::default().fg(Color::Cyan));
    f.render_widget(title_bar, chunks[0]);

    // 2. Content Area (Split into Sidebar and Messages)
    let content_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(30), // Sidebar
            Constraint::Percentage(70), // Messages/Logs
        ])
        .split(chunks[1]);

    // Sidebar Content
    let mut sidebar_items = Vec::new();
    
    sidebar_items.push(ListItem::new(Line::from(vec![
        Span::styled("● USER DETAILS", Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD))
    ])));
    sidebar_items.push(ListItem::new(Line::from(vec![
        Span::raw(" ID: "),
        Span::styled(&state.user_id, Style::default().fg(Color::Green))
    ])));
    sidebar_items.push(ListItem::new(Line::from("")));

    sidebar_items.push(ListItem::new(Line::from(vec![
        Span::styled("● JOINED ROOMS", Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD))
    ])));
    if state.joined_rooms.is_empty() {
        sidebar_items.push(ListItem::new(Line::from("  None (run /list)")));
    } else {
        for (idx, (name, _id, enc)) in state.joined_rooms.iter().enumerate() {
            let is_highlighted = !state.input_focus && state.highlighted_room_idx == idx;
            let is_active = state.active_room_idx == Some(idx);
            
            let prefix = if is_active && is_highlighted {
                "► * "
            } else if is_active {
                "►   "
            } else if is_highlighted {
                "  * "
            } else {
                "    "
            };

            let item_style = if is_active {
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
            } else if is_highlighted {
                Style::default().fg(Color::Cyan)
            } else {
                Style::default().fg(Color::White)
            };

            let enc_indicator = if enc == "Encrypted" { " [E2EE]" } else { " [Plain]" };
            let enc_color = if enc == "Encrypted" { Color::LightGreen } else { Color::DarkGray };

            sidebar_items.push(ListItem::new(Line::from(vec![
                Span::styled(format!("{}{}", prefix, name), item_style),
                Span::styled(enc_indicator, Style::default().fg(enc_color))
            ])));
        }
    }
    sidebar_items.push(ListItem::new(Line::from("")));

    sidebar_items.push(ListItem::new(Line::from(vec![
        Span::styled("● SESSION DEVICES", Style::default().fg(Color::Magenta).add_modifier(Modifier::BOLD))
    ])));
    if state.active_devices.is_empty() {
        sidebar_items.push(ListItem::new(Line::from("  None (run /devices <user>)")));
    } else {
        for (_u_id, d_id, verified) in &state.active_devices {
            let status = if *verified { " Verified" } else { " Unverified" };
            let status_color = if *verified { Color::LightGreen } else { Color::LightRed };
            sidebar_items.push(ListItem::new(Line::from(vec![
                Span::raw(format!("  • {}", d_id)),
                Span::styled(status, Style::default().fg(status_color))
            ])));
        }
    }

    let sidebar_border_color = if !state.input_focus { Color::Cyan } else { Color::DarkGray };
    let sidebar = List::new(sidebar_items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Navigation Sidebar [Tab]")
                .border_style(Style::default().fg(sidebar_border_color)),
        )
        .style(Style::default().fg(Color::White));
    f.render_widget(sidebar, content_chunks[0]);

    // Messages / Logs Pane
    let height = content_chunks[1].height.saturating_sub(2) as usize;
    let total_messages = state.messages.len();
    let start = total_messages
        .saturating_sub(height)
        .saturating_sub(state.scroll_offset);
    let end = (start + height).min(total_messages);
    
    let visible_messages = &state.messages[start..end];
    let message_lines: Vec<Line> = visible_messages
        .iter()
        .map(|m| Line::from(m.as_str()))
        .collect();

    let scroll_indicator = if state.scroll_offset > 0 {
        format!(" - Scroll: [{} / {}]", state.scroll_offset, total_messages)
    } else {
        "".to_string()
    };

    let messages_panel = Paragraph::new(message_lines)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!("Messages / Logs{}", scroll_indicator)),
        )
        .wrap(Wrap { trim: false });
    f.render_widget(messages_panel, content_chunks[1]);

    // 3. Input Box
    let input_title = if let Some(idx) = state.active_room_idx {
        if idx < state.joined_rooms.len() {
            format!("Command Input [Active Chat: {}]", state.joined_rooms[idx].0)
        } else {
            "Command Input".to_string()
        }
    } else {
        "Command Input (No Active Room Selected - Press Tab to Select)".to_string()
    };

    let input_border_color = if state.input_focus { Color::Cyan } else { Color::DarkGray };
    let input_widget = Paragraph::new(format!("> {}", state.input))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(input_title)
                .border_style(Style::default().fg(input_border_color)),
        );
    f.render_widget(input_widget, chunks[2]);
}
