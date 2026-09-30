package com.sami.tradingchallengetracker.ui

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.Query
import com.sami.tradingchallengetracker.util.CloudAsyncImage
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

/**
 * Dedicated Home Screen for Moderators (role == "moderator")
 * - Does NOT display the 150-trade challenge
 * - Shows Moderator Supervision Panel, Rules (3 warnings + Kick with report to Sami),
 *   Permitted Channels button, and Direct Message Sami button
 */
@Composable
fun AndroidModeratorHomeScreen(
    currentUser: AndroidAuthUser,
    onOpenChannels: () -> Unit,
    onOpenPrivateChat: () -> Unit,
    onLogout: () -> Unit,
    onAvatarUpdated: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var uploadingAvatar by remember { mutableStateOf(false) }

    val avatarLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            uploadingAvatar = true
            coroutineScope.launch {
                try {
                    val url = CommunityCloudManager.uploadUserAvatar(context, currentUser.id, uri)
                    onAvatarUpdated(url)
                    Toast.makeText(context, "تم تحديث الصورة الشخصية بنجاح", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    Toast.makeText(context, "تعذر تحديث الصورة الشخصية", Toast.LENGTH_SHORT).show()
                } finally {
                    uploadingAvatar = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Moderator Header Card
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xE6121824)),
            border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box {
                        UserCircularAvatar(
                            avatarUrl = currentUser.avatarUrl,
                            displayName = currentUser.displayName,
                            userId = currentUser.id,
                            role = "moderator",
                            size = 52.dp,
                            onClick = { avatarLauncher.launch("image/*") }
                        )
                        if (uploadingAvatar) {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .size(16.dp)
                                    .align(Alignment.BottomEnd),
                                strokeWidth = 2.dp,
                                color = Color(0xFF10B981)
                            )
                        }
                    }

                    Column {
                        RoleBadgeChip(role = "moderator", senderId = currentUser.id)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = currentUser.displayName,
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "اضغط على الصورة لتغيير صورتك الشخصية",
                            color = Color(0xFF94A3B8),
                            fontSize = 10.sp
                        )
                    }
                }

                OutlinedButton(
                    onClick = onLogout,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                    border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("خروج", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Moderator Role Summary Card
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xE60B2926)),
            border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.45f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "🛡️ لوحة مهام المشرف وإدارة القنوات",
                    color = Color(0xFF34D399),
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
                Text(
                    text = "بصفتك مشرفاً معيناً من القائد Sami، تقتصر مهامك على متابعة القنوات المصرح لك بها، حفظ النظام، توجيه الإنذارات للمخالفين، والتواصل المباشر مع القائد.",
                    color = Color.LightGray,
                    fontSize = 12.sp
                )
            }
        }

        // Supervision Rules Cards
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xE6121824)),
            border = BorderStroke(1.dp, Color(0xFF1E293B)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "⚠️ نظام الإنذارات الثلاثة والطرد",
                    color = Color(0xFFFFD700),
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp
                )
                Text(
                    text = "• يمتلك كل عضو الحد الأقصى (3 إنذارات): إنذار 1، إنذار 2، إنذار 3.",
                    color = Color.LightGray,
                    fontSize = 12.sp
                )
                Text(
                    text = "• عند استنفاد الإنذارات الثلاثة، يمكنك طرد المستخدم المخالف من القناة.",
                    color = Color.LightGray,
                    fontSize = 12.sp
                )
                Text(
                    text = "• عند طرد أي مستخدم، يقوم النظام تلقائياً بإرسال تقرير كامل إلى القائد Sami يتضمن اسم المشترك وسبب الطرد وصورة المخالفة.",
                    color = Color(0xFF34D399),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }

        // Primary Action Buttons
        Button(
            onClick = onOpenChannels,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
        ) {
            Icon(Icons.Default.Forum, contentDescription = null, tint = Color(0xFF0F172A))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "دخول القنوات المشرف عليها",
                color = Color(0xFF0F172A),
                fontWeight = FontWeight.Black,
                fontSize = 14.sp
            )
        }

        Button(
            onClick = onOpenPrivateChat,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
        ) {
            Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF0F172A))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "مراسلة القائد Sami وإرسال التقارير",
                color = Color(0xFF0F172A),
                fontWeight = FontWeight.Black,
                fontSize = 14.sp
            )
        }
    }
}

/**
 * Owner (Sami) Exclusive Control Panel Screen:
 * 1. Users Management (create user, delete user, change password, grant/revoke moderator)
 * 2. Channels Management (create channel, edit name/password/image/members, delete channel)
 * 3. Private Messages Inbox (permanent messages & moderator kick reports)
 */
@Composable
fun AndroidOwnerAdminScreen(
    currentUser: AndroidAuthUser
) {
    if (currentUser.id != 1 && currentUser.role != "owner") return

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var subTab by remember { mutableStateOf("users") } // "users" | "channels" | "messages"

    val users = remember { mutableStateListOf<AndroidAuthUser>() }
    val channels = remember { mutableStateListOf<AndroidCommunityChannel>() }
    val allPrivateMessages = remember { mutableStateListOf<AndroidPrivateMessage>() }

    var feedbackText by remember { mutableStateOf<String?>(null) }
    var isFeedbackError by remember { mutableStateOf(false) }
    var previewImageUrl by remember { mutableStateOf<String?>(null) }

    // User Management state
    var newUsername by remember { mutableStateOf("") }
    var newDisplayName by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var newRole by remember { mutableStateOf("user") }
    var editingPasswordUser by remember { mutableStateOf<AndroidAuthUser?>(null) }
    var updatedPasswordValue by remember { mutableStateOf("") }

    // Channel Modal state
    var channelDialogOpen by remember { mutableStateOf(false) }
    var editingChannel by remember { mutableStateOf<AndroidCommunityChannel?>(null) }
    var chNameInput by remember { mutableStateOf("") }
    var chPasswordInput by remember { mutableStateOf("") }
    val chSelectedMembers = remember { mutableStateListOf<Int>() }
    var chImageUri by remember { mutableStateOf<Uri?>(null) }
    var removeChImageFlag by remember { mutableStateOf(false) }
    var isSavingChannel by remember { mutableStateOf(false) }

    // Private Message Reply state
    var selectedParticipantId by remember { mutableStateOf<Int?>(null) }
    var replyText by remember { mutableStateOf("") }
    var replyImageUri by remember { mutableStateOf<Uri?>(null) }
    var isSendingReply by remember { mutableStateOf(false) }

    fun showFeedback(msg: String, isError: Boolean = false) {
        feedbackText = msg
        isFeedbackError = isError
        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
    }

    // Subscribe to users, channels, and private_messages
    DisposableEffect(Unit) {
        val db = FirebaseCloudHelper.getFirestore(context)
        val uReg = db.collection("community_users")
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val list = snap.documents.mapNotNull { doc ->
                    val id = doc.id.toIntOrNull() ?: (doc.getLong("id")?.toInt() ?: 0)
                    if (id <= 0) null else CommunityCloudManager.parseUserSnapshot(doc.data, id)
                }.sortedBy { it.id }
                users.clear()
                users.addAll(list)
            }

        val cReg = db.collection("community_channels")
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val list = snap.documents.map { doc ->
                    CommunityCloudManager.parseChannelSnapshot(doc.id, doc.data)
                }.sortedBy { it.createdAt }
                channels.clear()
                channels.addAll(list)
            }

        val pmReg = db.collection("private_messages")
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, _ ->
                if (snap == null) return@addSnapshotListener
                val list = snap.documents.map { doc ->
                    val sId = (doc.getLong("senderId") ?: 0L).toInt()
                    AndroidPrivateMessage(
                        id = doc.getString("id") ?: doc.id,
                        participantId = (doc.getLong("participantId") ?: 0L).toInt(),
                        participantName = doc.getString("participantName") ?: "مستخدم",
                        senderId = sId,
                        senderName = doc.getString("senderName") ?: "مستخدم",
                        senderRole = if (sId == 1) "owner" else (doc.getString("senderRole") ?: "user"),
                        senderAvatarUrl = doc.getString("senderAvatarUrl"),
                        receiverId = (doc.getLong("receiverId") ?: 1L).toInt(),
                        text = doc.getString("text"),
                        imageUrl = doc.getString("imageUrl"),
                        storagePath = doc.getString("storagePath"),
                        isReport = doc.getBoolean("isReport") ?: false,
                        timestamp = doc.getLong("timestamp") ?: System.currentTimeMillis()
                    )
                }.sortedBy { it.timestamp }
                allPrivateMessages.clear()
                allPrivateMessages.addAll(list)
            }

        onDispose {
            uReg.remove()
            cReg.remove()
            pmReg.remove()
        }
    }

    val channelImagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            chImageUri = uri
            removeChImageFlag = false
        }
    }

    val replyImagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            replyImageUri = uri
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070A10))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Owner Header
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1608)),
            border = BorderStroke(1.dp, Color(0xFFFFD700).copy(alpha = 0.5f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFFFD700)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("👑", fontSize = 20.sp)
                }
                Column {
                    Text("لوحة تحكم القائد Sami", color = Color(0xFFFFD700), fontWeight = FontWeight.Black, fontSize = 15.sp)
                    Text("إدارة المستخدمين • المشرفين • القنوات • الرسائل الخاصة", color = Color.LightGray, fontSize = 11.sp)
                }
            }
        }

        // Sub-Tabs Selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { subTab = "users" },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (subTab == "users") Color(0xFFFFD700) else Color(0xFF121824)
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    "المستخدمون (${users.size})",
                    color = if (subTab == "users") Color.Black else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Button(
                onClick = { subTab = "channels" },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (subTab == "channels") Color(0xFFFFD700) else Color(0xFF121824)
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    "القنوات (${channels.size})",
                    color = if (subTab == "channels") Color.Black else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Button(
                onClick = { subTab = "messages" },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (subTab == "messages") Color(0xFFFFD700) else Color(0xFF121824)
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    "الرسائل الخاصة",
                    color = if (subTab == "messages") Color.Black else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        val curFb = feedbackText
        if (curFb != null) {
            Surface(
                color = if (isFeedbackError) Color(0x33EF4444) else Color(0x3310B981),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = curFb,
                    color = if (isFeedbackError) Color(0xFFFCA5A5) else Color(0xFF34D399),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(10.dp)
                )
            }
        }

        // =====================================================================
        // SUB-TAB 1: USERS & MODERATORS MANAGEMENT
        // =====================================================================
        if (subTab == "users") {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF121824)),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("➕ إنشاء مستخدم جديد", color = Color(0xFFFFD700), fontWeight = FontWeight.Black, fontSize = 14.sp)
                            OutlinedTextField(
                                value = newUsername,
                                onValueChange = { newUsername = it },
                                label = { Text("اسم الدخول (Username)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = newDisplayName,
                                onValueChange = { newDisplayName = it },
                                label = { Text("الاسم المعروض (اختياري)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = { Text("كلمة المرور") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { newRole = "user" },
                                    border = BorderStroke(1.dp, if (newRole == "user") Color(0xFFFFD700) else Color.Gray),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("مستخدم عادي", color = if (newRole == "user") Color(0xFFFFD700) else Color.LightGray, fontSize = 12.sp)
                                }
                                OutlinedButton(
                                    onClick = { newRole = "moderator" },
                                    border = BorderStroke(1.dp, if (newRole == "moderator") Color(0xFF10B981) else Color.Gray),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("🛡️ مشرف", color = if (newRole == "moderator") Color(0xFF34D399) else Color.LightGray, fontSize = 12.sp)
                                }
                            }
                            Button(
                                onClick = {
                                    val uName = newUsername.trim()
                                    val dName = newDisplayName.trim().ifBlank { uName }
                                    val pass = newPassword.trim()
                                    if (uName.isEmpty() || pass.isEmpty()) {
                                        showFeedback("يرجى إدخال اسم المستخدم وكلمة المرور.", true)
                                        return@Button
                                    }
                                    if (users.any { it.username.equals(uName, ignoreCase = true) }) {
                                        showFeedback("اسم المستخدم موجود مسبقاً.", true)
                                        return@Button
                                    }
                                    coroutineScope.launch {
                                        try {
                                            val nextId = (users.maxOfOrNull { it.id } ?: 20) + 1
                                            val now = System.currentTimeMillis()
                                            val db = FirebaseCloudHelper.getFirestore(context)
                                            db.collection("community_users").document(nextId.toString()).set(
                                                mapOf(
                                                    "id" to nextId,
                                                    "username" to uName,
                                                    "displayName" to dName,
                                                    "password" to pass,
                                                    "role" to newRole,
                                                    "avatarUrl" to null,
                                                    "verifiedChannels" to emptyMap<String, String>(),
                                                    "warningsCount" to 0,
                                                    "createdAt" to now,
                                                    "updatedAt" to now
                                                )
                                            ).await()
                                            newUsername = ""
                                            newDisplayName = ""
                                            newPassword = ""
                                            newRole = "user"
                                            showFeedback("تم إنشاء الحساب $dName بنجاح.")
                                        } catch (_: Exception) {
                                            showFeedback("تعذر إنشاء المستخدم.", true)
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("إضافة المستخدم", color = Color.Black, fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }

                items(users, key = { it.id }) { u ->
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF121824)),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    UserCircularAvatar(
                                        avatarUrl = u.avatarUrl,
                                        displayName = u.displayName,
                                        userId = u.id,
                                        role = u.role,
                                        size = 40.dp
                                    )
                                    Column {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(
                                                text = u.displayName,
                                                color = getUserNameColor(u.id),
                                                fontWeight = FontWeight.Black,
                                                fontSize = 14.sp
                                            )
                                            RoleBadgeChip(role = u.role, senderId = u.id)
                                        }
                                        Text(
                                            text = "@${u.username} • كلمة المرور: ${u.password} • الإنذارات: ${u.warningsCount}/3",
                                            color = Color.Gray,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        editingPasswordUser = u
                                        updatedPasswordValue = u.password
                                    },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("🔑 كلمة المرور", color = Color(0xFFFFD700), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }

                                if (u.id != 1) {
                                    OutlinedButton(
                                        onClick = {
                                            val nextRole = if (u.role == "moderator") "user" else "moderator"
                                            coroutineScope.launch {
                                                try {
                                                    FirebaseCloudHelper.getFirestore(context)
                                                        .collection("community_users")
                                                        .document(u.id.toString())
                                                        .update(mapOf("role" to nextRole, "updatedAt" to System.currentTimeMillis()))
                                                        .await()
                                                    showFeedback(
                                                        if (nextRole == "moderator") "تم تعيين ${u.displayName} مشرفاً" else "تم إلغاء إشراف ${u.displayName}"
                                                    )
                                                } catch (_: Exception) {
                                                    showFeedback("تعذر تعديل الصلاحية.", true)
                                                }
                                            }
                                        },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(
                                            text = if (u.role == "moderator") "إلغاء الإشراف" else "🛡️ تعيين مشرف",
                                            color = Color(0xFF34D399),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    OutlinedButton(
                                        onClick = {
                                            coroutineScope.launch {
                                                try {
                                                    FirebaseCloudHelper.getFirestore(context)
                                                        .collection("community_users")
                                                        .document(u.id.toString())
                                                        .delete()
                                                        .await()
                                                    showFeedback("تم حذف المستخدم ${u.displayName}")
                                                } catch (_: Exception) {
                                                    showFeedback("تعذر حذف المستخدم.", true)
                                                }
                                            }
                                        },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text("حذف", color = Color(0xFFEF4444), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // SUB-TAB 2: CHANNELS MANAGEMENT
        // =====================================================================
        if (subTab == "channels") {
            Button(
                onClick = {
                    editingChannel = null
                    chNameInput = ""
                    chPasswordInput = ""
                    chSelectedMembers.clear()
                    chSelectedMembers.addAll(users.map { it.id })
                    chImageUri = null
                    removeChImageFlag = false
                    channelDialogOpen = true
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700)),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black)
                Spacer(modifier = Modifier.width(6.dp))
                Text("إنشاء قناة جديدة", color = Color.Black, fontWeight = FontWeight.Black)
            }

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(channels, key = { it.id }) { ch ->
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF121824)),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                if (!ch.imageUrl.isNullOrBlank()) {
                                    CloudAsyncImage(
                                        imageUrl = ch.imageUrl,
                                        contentDescription = ch.name,
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(RoundedCornerShape(12.dp)),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Color(0xFFFFD700)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("💬", fontSize = 22.sp)
                                    }
                                }
                                Column {
                                    Text(ch.name, color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                                    Text(
                                        "كلمة المرور: ${ch.password} • الأعضاء: ${ch.memberIds.size}",
                                        color = Color(0xFFFFD700),
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                OutlinedButton(
                                    onClick = {
                                        editingChannel = ch
                                        chNameInput = ch.name
                                        chPasswordInput = ch.password
                                        chSelectedMembers.clear()
                                        chSelectedMembers.addAll(ch.memberIds)
                                        chImageUri = null
                                        removeChImageFlag = false
                                        channelDialogOpen = true
                                    },
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("تعديل", color = Color(0xFFFFD700), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }

                                OutlinedButton(
                                    onClick = {
                                        coroutineScope.launch {
                                            try {
                                                FirebaseCloudHelper.getFirestore(context)
                                                    .collection("community_channels")
                                                    .document(ch.id)
                                                    .delete()
                                                    .await()
                                                FirebaseCloudHelper.deleteCloudImage(context, ch.imageUrl, ch.storagePath)
                                                showFeedback("تم حذف القناة ${ch.name}")
                                            } catch (_: Exception) {
                                                showFeedback("تعذر حذف القناة.", true)
                                            }
                                        }
                                    },
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("حذف", color = Color(0xFFEF4444), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // SUB-TAB 3: PRIVATE MESSAGES & REPORTS INBOX FOR OWNER SAMI
        // =====================================================================
        if (subTab == "messages") {
            val activeParticipantId = selectedParticipantId
            if (activeParticipantId == null) {
                val otherUsers = users.filter { it.id != 1 }
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(otherUsers, key = { it.id }) { u ->
                        val userThread = allPrivateMessages.filter { it.participantId == u.id }
                        val lastMsg = userThread.lastOrNull()
                        val hasReport = userThread.any { it.isReport }
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF121824)),
                            border = BorderStroke(1.dp, if (hasReport) Color(0xFFEF4444) else Color(0xFF1E293B)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedParticipantId = u.id }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    UserCircularAvatar(
                                        avatarUrl = u.avatarUrl,
                                        displayName = u.displayName,
                                        userId = u.id,
                                        role = u.role,
                                        size = 40.dp
                                    )
                                    Column {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(u.displayName, color = getUserNameColor(u.id), fontWeight = FontWeight.Black, fontSize = 13.sp)
                                            RoleBadgeChip(role = u.role, senderId = u.id)
                                        }
                                        Text(
                                            text = lastMsg?.text ?: "لا توجد رسائل بعد • اضغط للمراسلة",
                                            color = Color.Gray,
                                            fontSize = 11.sp,
                                            maxLines = 1
                                        )
                                    }
                                }
                                Text("${userThread.size} رسالة", color = Color(0xFFFFD700), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                val targetUser = users.find { it.id == activeParticipantId }
                val threadMessages = allPrivateMessages.filter { it.participantId == activeParticipantId }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "محادثة خاصة مع: ${targetUser?.displayName ?: "مستخدم"}",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp
                    )
                    OutlinedButton(onClick = { selectedParticipantId = null }) {
                        Text("رجوع للقائمة", color = Color(0xFFFFD700), fontSize = 11.sp)
                    }
                }

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(threadMessages, key = { it.id }) { pm ->
                        val isSami = pm.senderId == 1
                        Surface(
                            color = if (pm.isReport) Color(0x33EF4444) else if (isSami) Color(0xFF2B2108) else Color(0xFF131D30),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(
                                1.dp,
                                if (pm.isReport) Color(0xFFEF4444) else if (isSami) Color(0xFFFFD700) else Color(0xFF1E293B)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = pm.senderName,
                                        color = getUserNameColor(pm.senderId),
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp
                                    )
                                    val tf = SimpleDateFormat("hh:mm a", Locale.getDefault())
                                    Text(tf.format(Date(pm.timestamp)), color = Color.Gray, fontSize = 9.sp)
                                }
                                if (!pm.imageUrl.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    CloudAsyncImage(
                                        imageUrl = pm.imageUrl,
                                        contentDescription = "مرفق",
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(160.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .clickable { previewImageUrl = pm.imageUrl },
                                        contentScale = ContentScale.Fit
                                    )
                                }
                                if (!pm.text.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(pm.text, color = Color.White, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    IconButton(onClick = { replyImagePicker.launch("image/*") }) {
                        Icon(Icons.Default.Image, contentDescription = null, tint = Color(0xFFFFD700))
                    }
                    OutlinedTextField(
                        value = replyText,
                        onValueChange = { replyText = it },
                        placeholder = { Text("اكتب رد القائد Sami...", fontSize = 12.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        enabled = !isSendingReply && (replyText.isNotBlank() || replyImageUri != null),
                        onClick = {
                            isSendingReply = true
                            coroutineScope.launch {
                                try {
                                    val now = System.currentTimeMillis()
                                    var imgUrl: String? = null
                                    val rUri = replyImageUri
                                    if (rUri != null) {
                                        imgUrl = FirebaseCloudHelper.uploadImageToCloud(context, rUri, "chat_images", 1).first
                                    }
                                    val pmId = "pm_${now}_1_${UUID.randomUUID().toString().take(5)}"
                                    val payload = mutableMapOf<String, Any>(
                                        "id" to pmId,
                                        "participantId" to activeParticipantId,
                                        "participantName" to (targetUser?.displayName ?: "مستخدم"),
                                        "senderId" to 1,
                                        "senderName" to "Sami",
                                        "senderRole" to "owner",
                                        "receiverId" to activeParticipantId,
                                        "isReport" to false,
                                        "timestamp" to now
                                    )
                                    if (replyText.isNotBlank()) payload["text"] = replyText.trim()
                                    if (imgUrl != null) payload["imageUrl"] = imgUrl

                                    FirebaseCloudHelper.getFirestore(context)
                                        .collection("private_messages")
                                        .document(pmId)
                                        .set(payload)
                                        .await()

                                    CommunityCloudManager.emitNotification(
                                        context = context,
                                        type = "private_message",
                                        title = "👑 رسالة خاصة من القائد Sami",
                                        body = replyText.trim().ifEmpty { "أرسل صورة مرفقة" },
                                        senderId = 1,
                                        senderName = "Sami",
                                        senderRole = "owner",
                                        channelId = null,
                                        targetUserIds = listOf(activeParticipantId)
                                    )

                                    replyText = ""
                                    replyImageUri = null
                                } catch (_: Exception) {
                                    showFeedback("تعذر إرسال الرد.", true)
                                } finally {
                                    isSendingReply = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700))
                    ) {
                        Text("إرسال", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 12.sp)
                    }
                }
            }
        }
    }

    // Edit User Password Dialog
    val passTargetUser = editingPasswordUser
    if (passTargetUser != null) {
        AlertDialog(
            onDismissRequest = { editingPasswordUser = null },
            title = {
                Text("تعديل كلمة مرور: ${passTargetUser.displayName}", color = Color.White, fontWeight = FontWeight.Black, fontSize = 15.sp)
            },
            text = {
                OutlinedTextField(
                    value = updatedPasswordValue,
                    onValueChange = { updatedPasswordValue = it },
                    label = { Text("كلمة المرور الجديدة") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmed = updatedPasswordValue.trim()
                        if (trimmed.isNotEmpty()) {
                            coroutineScope.launch {
                                try {
                                    FirebaseCloudHelper.getFirestore(context)
                                        .collection("community_users")
                                        .document(passTargetUser.id.toString())
                                        .update(mapOf("password" to trimmed, "updatedAt" to System.currentTimeMillis()))
                                        .await()
                                    editingPasswordUser = null
                                    showFeedback("تم تحديث كلمة المرور بنجاح.")
                                } catch (_: Exception) {
                                    showFeedback("تعذر تحديث كلمة المرور.", true)
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700))
                ) {
                    Text("حفظ", color = Color.Black, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { editingPasswordUser = null }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = Color(0xFF121824)
        )
    }

    // Create / Edit Channel Dialog
    if (channelDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isSavingChannel) channelDialogOpen = false },
            title = {
                Text(
                    text = if (editingChannel != null) "تعديل القناة: ${editingChannel?.name}" else "إنشاء قناة جديدة",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = chNameInput,
                        onValueChange = { chNameInput = it },
                        label = { Text("اسم القناة") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = chPasswordInput,
                        onValueChange = { chPasswordInput = it },
                        label = { Text("كلمة مرور القناة المستقلة") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { channelImagePicker.launch("image/*") },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = if (chImageUri != null) "✔ تم اختيار صورة" else "📷 اختيار صورة للقناة",
                                color = Color(0xFFFFD700),
                                fontSize = 11.sp
                            )
                        }
                        if (editingChannel?.imageUrl != null || chImageUri != null) {
                            OutlinedButton(
                                onClick = {
                                    chImageUri = null
                                    removeChImageFlag = true
                                }
                            ) {
                                Text("حذف الصورة", color = Color(0xFFEF4444), fontSize = 11.sp)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("أعضاء القناة المسموح لهم (${chSelectedMembers.size}):", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            TextButton(onClick = {
                                chSelectedMembers.clear()
                                chSelectedMembers.addAll(users.map { it.id })
                            }) {
                                Text("تحديد الكل", color = Color(0xFFFFD700), fontSize = 11.sp)
                            }
                            TextButton(onClick = {
                                chSelectedMembers.clear()
                                chSelectedMembers.add(1)
                            }) {
                                Text("إلغاء الكل", color = Color.Gray, fontSize = 11.sp)
                            }
                        }
                    }

                    users.forEach { u ->
                        val isChecked = u.id == 1 || chSelectedMembers.contains(u.id)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = u.id != 1) {
                                    if (chSelectedMembers.contains(u.id)) {
                                        chSelectedMembers.remove(u.id)
                                    } else {
                                        chSelectedMembers.add(u.id)
                                    }
                                }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Checkbox(
                                    checked = isChecked,
                                    onCheckedChange = {
                                        if (u.id != 1) {
                                            if (chSelectedMembers.contains(u.id)) {
                                                chSelectedMembers.remove(u.id)
                                            } else {
                                                chSelectedMembers.add(u.id)
                                            }
                                        }
                                    },
                                    enabled = u.id != 1
                                )
                                Text(u.displayName, color = getUserNameColor(u.id), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            RoleBadgeChip(role = u.role, senderId = u.id)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !isSavingChannel && chNameInput.isNotBlank() && chPasswordInput.isNotBlank(),
                    onClick = {
                        isSavingChannel = true
                        coroutineScope.launch {
                            try {
                                val now = System.currentTimeMillis()
                                val db = FirebaseCloudHelper.getFirestore(context)
                                val targetEdit = editingChannel
                                val channelId = targetEdit?.id ?: "channel_${now}_${UUID.randomUUID().toString().take(5)}"

                                var finalImageUrl = if (removeChImageFlag) null else targetEdit?.imageUrl
                                var finalStoragePath = if (removeChImageFlag) null else targetEdit?.storagePath

                                val pickedUri = chImageUri
                                if (pickedUri != null) {
                                    val up = FirebaseCloudHelper.uploadImageToCloud(context, pickedUri, "channel_images", 1)
                                    finalImageUrl = up.first
                                    finalStoragePath = up.second
                                }

                                val finalMembers = (listOf(1) + chSelectedMembers).distinct()
                                db.collection("community_channels").document(channelId).set(
                                    mapOf(
                                        "id" to channelId,
                                        "name" to chNameInput.trim(),
                                        "imageUrl" to finalImageUrl,
                                        "storagePath" to finalStoragePath,
                                        "password" to chPasswordInput.trim(),
                                        "memberIds" to finalMembers,
                                        "createdBy" to 1,
                                        "createdAt" to (targetEdit?.createdAt ?: now),
                                        "updatedAt" to now
                                    )
                                ).await()

                                channelDialogOpen = false
                                showFeedback(if (targetEdit != null) "تم تحديث القناة بنجاح." else "تم إنشاء القناة بنجاح.")
                            } catch (_: Exception) {
                                showFeedback("تعذر حفظ القناة.", true)
                            } finally {
                                isSavingChannel = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD700))
                ) {
                    Text("حفظ القناة", color = Color.Black, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { channelDialogOpen = false }) {
                    Text("إلغاء", color = Color.LightGray)
                }
            },
            containerColor = Color(0xFF121824)
        )
    }

    val activePrev = previewImageUrl
    if (activePrev != null) {
        FullScreenImageViewerDialog(
            imageUrl = activePrev,
            onDismiss = { previewImageUrl = null }
        )
    }
}
